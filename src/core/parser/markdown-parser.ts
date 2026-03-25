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
  private defaultIndentSize: number = 2;

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

    // Split into lines and filter out empty lines
    const lines = markdown.split('\n').filter(line => line.trim().length > 0);

    // Check if we have any valid content after filtering
    if (lines.length === 0) {
      throw new ParseError(
        'No valid content found: markdown contains only whitespace',
        0,
        undefined,
        'empty'
      );
    }

    // Detect indentation type and size
    let indentType: IndentationType;
    let indentSize: number;

    try {
      const indentResult = detectIndentation(markdown);
      indentType = indentResult.type;
      indentSize = indentResult.indentSize;
    } catch (error) {
      // No indented lines found - treat as single-level document
      if (error instanceof IndentationError) {
        indentType = 'spaces';
        indentSize = this.defaultIndentSize;
      } else {
        throw error;
      }
    }

    // Validate indentation consistency
    const indentationValidation = validateIndentation(markdown, indentType);
    const hasMixedIndentation = indentationValidation.inconsistencies.length > 0;

    // If mixed indentation detected, normalize and warn
    let processedMarkdown = markdown;
    let warning: MarkdownParseWarning | null = null;

    if (hasMixedIndentation) {
      // Attempt to normalize indentation
      processedMarkdown = normalizeIndentation(markdown, indentType, indentSize);
      warning = {
        message: `Mixed indentation detected. Normalized to ${indentType} with ${indentSize} spaces per level.`,
        line: indentationValidation.inconsistencies[0]?.line ?? 0,
        type: 'mixed-indentation',
      };
    }

    // Re-split lines after potential normalization
    const processedLines = processedMarkdown.split('\n').filter(line => line.trim().length > 0);

    // Validate tree structure
    const structureValidation = validateTreeStructure(processedLines, indentType, indentSize);

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
      const result = buildTree(processedLines, indentType, indentSize);
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
    const lines: string[] = [];

    /**
     * Recursively serializes a node and its children
     * @param node - Current node to serialize
     * @param depth - Current indentation depth
     */
    function serializeNode(node: TreeNode, depth: number): void {
      // Add indentation
      const indent = '  '.repeat(depth);
      lines.push(`${indent}${node.content}`);

      // Recursively serialize children
      for (const child of node.children) {
        serializeNode(child, depth + 1);
      }
    }

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

    // Check for empty input
    if (!markdown || markdown.trim().length === 0) {
      return {
        valid: false,
        errors: [{
          message: 'No content to parse: markdown input is empty',
          line: 0,
          type: 'empty',
        }],
        warnings: [],
      };
    }

    // Split into lines
    const lines = markdown.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);

    // Check for whitespace-only input
    if (nonEmptyLines.length === 0) {
      return {
        valid: false,
        errors: [{
          message: 'No valid content found: markdown contains only whitespace',
          line: 0,
          type: 'empty',
        }],
        warnings: [],
      };
    }

    // Detect indentation
    let indentType: IndentationType;
    let indentSize: number;

    try {
      const indentResult = detectIndentation(markdown);
      indentType = indentResult.type;
      indentSize = indentResult.indentSize;
    } catch {
      // No indented lines - single level document is valid
      indentType = 'spaces';
      indentSize = this.defaultIndentSize;
    }

    // Check for mixed indentation
    const indentationValidation = validateIndentation(markdown, indentType);
    if (indentationValidation.inconsistencies.length > 0) {
      warnings.push({
        message: `Mixed indentation detected. Found ${indentationValidation.inconsistencies[0]?.found} but expected ${indentationValidation.inconsistencies[0]?.expected}.`,
        line: indentationValidation.inconsistencies[0]?.line ?? 0,
        type: 'mixed-indentation',
      });
    }

    // Validate tree structure
    const structureValidation = validateTreeStructure(nonEmptyLines, indentType, indentSize);

    for (const error of structureValidation.errors) {
      errors.push({
        message: error.message,
        line: error.line,
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
    this.defaultIndentSize = size;
  }
}

/**
 * Creates a new parser instance with default settings
 * @returns New IndentationParser instance
 */
export function createMarkdownParser(): MarkdownParser {
  return new IndentationParser();
}