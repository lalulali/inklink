/**
 * Feature: Markdown Parser
 * Purpose: Converts markdown text to tree structure using indentation-based parsing
 * Dependencies: TreeNode from core/types, indentation detection, tree builder
 * Error Handling: Comprehensive error handling for empty input, invalid indentation, mixed types
 */

import { TreeNode } from '../types/tree-node';
import {
  IndentationType,
  detectIndentation,
  IndentationError,
  validateIndentation,
  normalizeIndentation,
} from './indentation';
import {
  buildTree,
  TreeBuildError,
  validateTreeStructure,
  TreeValidationResult,
} from './tree-builder';

/**
 * Markdown parser interface
 * Converts markdown text to tree structure
 */
export interface MarkdownParser {
  /**
   * Parse markdown text into tree structure
   * @param markdown - Raw markdown text
   * @returns Root node of parsed tree
   * @throws ParseError if markdown is invalid
   */
  parse(markdown: string): TreeNode;

  /**
   * Convert tree structure back to markdown
   * @param root - Root node of tree
   * @returns Formatted markdown text
   */
  serialize(root: TreeNode): string;

  /**
   * Validate markdown structure
   * @param markdown - Raw markdown text
   * @returns Validation result with errors/warnings
   */
  validate(markdown: string): MarkdownValidationResult;
}

/**
 * Result of markdown validation
 */
export interface MarkdownValidationResult {
  valid: boolean;
  errors: MarkdownParseError[];
  warnings: MarkdownParseWarning[];
  indentationType?: IndentationType;
  indentSize?: number;
}

/**
 * Represents a markdown parsing error
 */
export interface MarkdownParseError {
  message: string;
  line: number;
  column?: number;
  type: 'empty' | 'indentation' | 'structure' | 'mixed-indentation';
}

/**
 * Represents a markdown parsing warning
 */
export interface MarkdownParseWarning {
  message: string;
  line: number;
  type: 'mixed-indentation' | 'normalization';
}

/**
 * Custom error class for parse errors with line and column information
 */
export class ParseError extends Error {
  line: number;
  column?: number;
  type: 'empty' | 'indentation' | 'structure' | 'mixed-indentation';

  constructor(
    message: string,
    line: number,
    column?: number,
    type: 'empty' | 'indentation' | 'structure' | 'mixed-indentation' = 'structure'
  ) {
    super(message);
    this.name = 'ParseError';
    this.line = line;
    this.column = column;
    this.type = type;
  }
}

/**
 * Indentation-based markdown parser implementation
 * Converts markdown text into a tree structure based on indentation levels
 */
export class IndentationParser implements MarkdownParser {
  private indentSize: number = 2;
  private indentType: IndentationType = 'spaces';

  /**
   * Parses markdown text into a tree structure
   * 
   * @param markdown - Raw markdown text to parse
   * @returns Root TreeNode of the parsed tree
   * @throws ParseError for various invalid input scenarios
   * 
   * Error handling cases:
   * - Empty input: Returns error indicating no content
   * - Whitespace-only input: Returns error indicating no valid content
   * - Mixed indentation: Returns warning and attempts normalization
   * - Invalid indentation patterns: Returns descriptive error with line info
   */
  parse(markdown: string): TreeNode {
    // Handle empty or whitespace-only input
    if (!markdown || markdown.trim().length === 0) {
      throw new ParseError(
        'No content to parse: markdown input is empty',
        0,
        undefined,
        'empty'
      );
    }

    const rawLines = markdown.split('\n');
    if (rawLines.length > 10000) {
      throw new ParseError(
        `Markdown input exceeds 10,000 line limit (found ${rawLines.length} lines)`,
        10000,
        undefined,
        'structure'
      );
    }

    // Filter out empty lines for processing
    const lines = rawLines.filter(line => line.trim().length > 0);

    // Check if we have any valid content after filtering
    if (lines.length === 0) {
      throw new ParseError(
        'No valid content found: markdown contains only whitespace',
        0,
        undefined,
        'empty'
      );
    }

    try {
      const indentResult = detectIndentation(markdown);
      this.indentType = indentResult.type;
      this.indentSize = indentResult.indentSize;
    } catch (error) {
      // No indented lines found - treat as single-level document
      if (error instanceof IndentationError) {
        this.indentType = 'spaces';
        // Keep existing indentSize
      } else {
        throw error;
      }
    }

    const currentIndentType = this.indentType;
    const currentIndentSize = this.indentSize;

    // Validate indentation consistency
    const indentationValidation = validateIndentation(markdown, currentIndentType);
    const hasMixedIndentation = indentationValidation.inconsistencies.length > 0;

    // If mixed indentation detected, normalize and warn
    let processedMarkdown = markdown;
    let warning: MarkdownParseWarning | null = null;

    if (hasMixedIndentation) {
      // Attempt to normalize indentation
      processedMarkdown = normalizeIndentation(markdown, currentIndentType, currentIndentSize);
      // We store the warning but don't throw, as normalization was requested/possible
      const firstInconsistency = indentationValidation.inconsistencies[0];
      if (firstInconsistency) {
        console.warn(`Mixed indentation detected at line ${firstInconsistency.line + 1}: ${firstInconsistency.message}`);
      }
    }

    // Re-split lines after potential normalization
    const processedLines = processedMarkdown.split('\n').filter(line => line.trim().length > 0);

    // Validate tree structure
    const structureValidation = validateTreeStructure(processedLines, currentIndentType, currentIndentSize);

    if (!structureValidation.valid && structureValidation.errors.length > 0) {
      const firstError = structureValidation.errors[0];
      throw new ParseError(
        firstError.message,
        firstError.line,
        undefined,
        'structure'
      );
    }

    // Build the tree
    try {
      const result = buildTree(processedLines, currentIndentType, currentIndentSize);
      return result.root;
    } catch (error) {
      // Convert tree build errors to ParseError
      if (error instanceof TreeBuildError) {
        throw new ParseError(
          error.message,
          error.line,
          undefined,
          'structure'
        );
      }
      throw error;
    }
  }

  /**
   * Converts a tree structure back to markdown format
   * 
   * @param root - Root node of the tree
   * @returns Formatted markdown text
   * 
   * Algorithm:
   * 1. Use recursive depth-first traversal
   * 2. Add indentation based on node depth
   * 3. Join lines with newlines
   */
  serialize(root: TreeNode): string {
    if (!root) {
      return '';
    }

    const lines: string[] = [];
    const indentString = this.indentType === 'tabs' ? '\t' : ' '.repeat(this.indentSize);

    /**
     * Recursively serializes a node and its children
     * 
     * @param node - Current node to serialize
     * @param depth - Current indentation depth
     */
    const serializeNode = (node: TreeNode, depth: number): void => {
      // Add indentation based on depth
      const indent = indentString.repeat(depth);
      lines.push(`${indent}${node.content}`);

      // Recursively serialize children
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          serializeNode(child, depth + 1);
        }
      }
    };

    // Serialize starting from root
    serializeNode(root, 0);

    return lines.join('\n');
  }

  /**
   * Validates markdown structure without parsing
   * 
   * @param markdown - Raw markdown text
   * @returns Validation result with errors and warnings
   */
  validate(markdown: string): MarkdownValidationResult {
    const errors: MarkdownParseError[] = [];
    const warnings: MarkdownParseWarning[] = [];

    // Check for empty or whitespace-only input
    if (!markdown || markdown.trim().length === 0) {
      errors.push({
        message: !markdown || markdown.length === 0 ? 'Markdown input is empty' : 'Markdown input contains only whitespace',
        line: 0,
        type: 'empty',
      });
      return { valid: false, errors, warnings };
    }

    const lines = markdown.split('\n');
    if (lines.length > 10000) {
      errors.push({
        message: `Markdown input exceeds 10,000 line limit (found ${lines.length} lines)`,
        line: 10000,
        type: 'structure',
      });
      return { valid: false, errors, warnings };
    }

    const nonEmptyLines = lines.filter(line => line.trim().length > 0);

    // Initial indentation detection
    let indentType: IndentationType;
    let indentSize: number;

    try {
      const indentResult = detectIndentation(markdown);
      indentType = indentResult.type;
      indentSize = indentResult.indentSize;
    } catch {
      // Single level document or ambiguity
      indentType = this.indentType;
      indentSize = this.indentSize;
    }

    // Indentation consistency validation
    const indentationValidation = validateIndentation(markdown, indentType);
    for (const inconsistency of indentationValidation.inconsistencies) {
      warnings.push({
        message: inconsistency.message,
        line: inconsistency.line,
        type: 'mixed-indentation',
      });
    }

    // Structure validation
    const structureValidation = validateTreeStructure(nonEmptyLines, indentType, indentSize);
    for (const error of structureValidation.errors) {
      // Calculate column roughly based on indentation
      const lineIndex = lines.findIndex(l => l.trim() === lines.filter(line => line.trim().length > 0)[error.line]?.trim());
      const actualLine = lines[lineIndex === -1 ? error.line : lineIndex];
      const column = actualLine ? actualLine.length - actualLine.trimStart().length : 0;

      errors.push({
        message: error.message,
        line: error.line,
        column,
        type: 'structure',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      indentationType: indentType,
      indentSize,
    };
  }

  /**
   * Sets the default indent size for space-based indentation
   * @param size - Number of spaces per indentation level (default: 2)
   */
  setDefaultIndentSize(size: number): void {
    if (size < 1 || size > 8) {
      throw new Error('Indent size must be between 1 and 8');
    }
    this.indentSize = size;
  }

  /**
   * Sets the default indentation type
   * @param type - 'spaces' or 'tabs'
   */
  setIndentationType(type: IndentationType): void {
    this.indentType = type;
  }
}

/**
 * Creates a new parser instance with default settings
 * @returns New IndentationParser instance
 */
export function createMarkdownParser(): MarkdownParser {
  return new IndentationParser();
}