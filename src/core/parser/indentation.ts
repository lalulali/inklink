/**
 * Feature: Indentation Detection
 * Purpose: Detects and validates indentation type (spaces vs tabs) in markdown
 * Dependencies: None (pure utility)
 */

/**
 * Supported indentation types
 */
export type IndentationType = 'spaces' | 'tabs';

/**
 * Result of indentation detection
 */
export interface IndentationResult {
  type: IndentationType;
  indentSize: number;
  firstIndentedLine: number;
}

/**
 * Detects the indentation type used in markdown content
 * @param markdown - Raw markdown text
 * @returns IndentationResult with type, size, and line info
 * @throws Error if no indented lines are found
 */
export function detectIndentation(markdown: string): IndentationResult {
  const lines = markdown.split('\n');
  let firstIndentedLine = -1;
  let detectedType: IndentationType | null = null;
  let indentSize = 2; // Default, will be updated

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and lines with only content (no leading whitespace)
    if (trimmedLine.length === 0 || line === trimmedLine) {
      continue;
    }

    // Found a line with leading whitespace
    if (firstIndentedLine === -1) {
      firstIndentedLine = i;
    }

    // Count leading spaces
    if (line.startsWith(' ')) {
      if (detectedType === null) {
        detectedType = 'spaces';
        // Count spaces to determine indent size
        let spaceCount = 0;
        for (const char of line) {
          if (char === ' ') {
            spaceCount++;
          } else {
            break;
          }
        }
        indentSize = spaceCount;
      } else if (detectedType === 'tabs') {
        // Mixed indentation detected
        return {
          type: 'spaces',
          indentSize,
          firstIndentedLine,
        };
      }
    }
    // Count leading tabs
    else if (line.startsWith('\t')) {
      if (detectedType === null) {
        detectedType = 'tabs';
        indentSize = 1; // Tab is always size 1
      } else if (detectedType === 'spaces') {
        // Mixed indentation detected
        return {
          type: 'tabs',
          indentSize: 1,
          firstIndentedLine,
        };
      }
    }
  }

  // No indented lines found
  if (firstIndentedLine === -1) {
    throw new IndentationError(
      'No indented lines found in markdown content',
      -1
    );
  }

  return {
    type: detectedType!,
    indentSize,
    firstIndentedLine,
  };
}

/**
 * Validates that all indentation in the document is consistent
 * @param markdown - Raw markdown text
 * @param expectedType - Expected indentation type
 * @returns ValidationResult with any inconsistencies found
 */
export function validateIndentation(
  markdown: string,
  expectedType: IndentationType
): IndentationValidationResult {
  const lines = markdown.split('\n');
  const inconsistencies: IndentationInconsistency[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine.length === 0) {
      continue;
    }

    // Check for leading whitespace
    if (line !== trimmedLine) {
      const hasLeadingSpaces = line.startsWith(' ');
      const hasLeadingTabs = line.startsWith('\t');

      if (expectedType === 'spaces' && hasLeadingTabs) {
        inconsistencies.push({
          line: i,
          found: 'tabs',
          expected: 'spaces',
          message: `Line ${i + 1}: Found tab indentation, expected spaces`,
        });
      } else if (expectedType === 'tabs' && hasLeadingSpaces) {
        inconsistencies.push({
          line: i,
          found: 'spaces',
          expected: 'tabs',
          message: `Line ${i + 1}: Found space indentation, expected tabs`,
        });
      }
    }
  }

  return {
    valid: inconsistencies.length === 0,
    inconsistencies,
  };
}

/**
 * Normalizes indentation to the expected type
 * @param markdown - Raw markdown text
 * @param targetType - Target indentation type
 * @param indentSize - Number of spaces or tabs per level
 * @returns Markdown with normalized indentation
 */
export function normalizeIndentation(
  markdown: string,
  targetType: IndentationType,
  indentSize: number = 2
): string {
  const lines = markdown.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Empty lines pass through unchanged
    if (trimmedLine.length === 0) {
      result.push('');
      continue;
    }

    // Count current indentation
    let currentIndent = 0;
    for (const char of line) {
      if (char === ' ' || char === '\t') {
        currentIndent++;
      } else {
        break;
      }
    }

    // Calculate new indentation
    const currentType = line.startsWith('\t') ? 'tabs' : 'spaces';
    const currentIndentSize = currentType === 'tabs' ? 1 : 2; // Simplified

    // Convert indent levels
    const indentLevels = Math.round(currentIndent / currentIndentSize);
    const newIndent = targetType === 'tabs'
      ? '\t'.repeat(indentLevels)
      : ' '.repeat(indentLevels * indentSize);

    result.push(newIndent + trimmedLine);
  }

  return result.join('\n');
}

/**
 * Calculates the indentation level of a line
 * @param line - A single line of markdown
 * @param indentType - The detected indentation type
 * @param indentSize - The indent size for spaces
 * @returns Number of indentation levels
 */
export function calculateIndentLevel(
  line: string,
  indentType: IndentationType,
  indentSize: number
): number {
  const trimmed = line.trimStart();
  if (trimmed.length === 0) return 0;

  // 1. Check for Markdown headers (e.g., # Level 0, ## Level 1)
  if (trimmed.startsWith('#')) {
    let hashCount = 0;
    while (hashCount < trimmed.length && trimmed[hashCount] === '#') {
      hashCount++;
    }
    return Math.max(0, hashCount - 1);
  }

  // 2. Check for indentation
  let whitespaceLength = 0;
  for (const char of line) {
    if (char === ' ' || char === '\t') {
      whitespaceLength += (char === '\t' ? indentSize : 1);
    } else {
      break;
    }
  }
  const indentLevel = Math.floor(whitespaceLength / indentSize);

  // 3. Check for list markers (- , * , + , 1. )
  // List markers implicitly add a level if they are at the same indentation as text
  const isList = /^(\*|-|\+|\d+\.)\s/.test(trimmed);
  
  // If it's a list item, we treat it as its indentation level
  // But we might want headers to be top-level always.
  // Standard mindmap behavior: headers and lists are both hierarchy indicators.
  return isList ? indentLevel + 1 : indentLevel;
}

/**
 * Error class for indentation-related errors
 */
export class IndentationError extends Error {
  line: number;

  constructor(message: string, line: number) {
    super(message);
    this.name = 'IndentationError';
    this.line = line;
  }
}

/**
 * Represents an indentation inconsistency
 */
export interface IndentationInconsistency {
  line: number;
  found: 'spaces' | 'tabs';
  expected: 'spaces' | 'tabs';
  message: string;
}

/**
 * Result of indentation validation
 */
export interface IndentationValidationResult {
  valid: boolean;
  inconsistencies: IndentationInconsistency[];
}