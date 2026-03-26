/**
 * Feature: Tree Builder
 * Purpose: Constructs tree structure from markdown lines using stack-based algorithm
 * Dependencies: TreeNode, createTreeNode from core/types/tree-node
 */

import { TreeNode, createTreeNode } from '../types/tree-node';
import {
  IndentationType,
  detectIndentation,
  calculateIndentLevel,
  IndentationError,
} from './indentation';

/**
 * Result of tree building operation
 */
export interface TreeBuildResult {
  root: TreeNode;
  lineCount: number;
  maxDepth: number;
}

/**
 * Builds a tree structure from markdown lines using stack-based construction
 * 
 * Algorithm:
 * 1. Use a stack to track current parent nodes at each depth level
 * 2. For each line, calculate its indentation level
 * 3. Pop stack until we find the parent of the current line
 * 4. Create new node and add as child to parent
 * 5. Push new node to stack for potential children
 * 
 * @param lines - Array of markdown lines (non-empty, trimmed)
 * @param indentType - Detected indentation type (spaces or tabs)
 * @param indentSize - Number of spaces per indentation level
 * @returns TreeBuildResult containing root node and metadata
 * @throws IndentationError if indentation is inconsistent
 */
export function buildTree(
  lines: string[],
  indentType: IndentationType,
  indentSize: number
): TreeBuildResult {
  if (lines.length === 0) {
    throw new TreeBuildError('Cannot build tree from empty input', -1);
  }

  // Pre-process to find the baseline depth (first non-empty line)
  let firstLineDepth = -1;
  for (const line of lines) {
    if (line.trim().length > 0) {
      firstLineDepth = calculateIndentLevel(line, indentType, indentSize);
      break;
    }
  }

  const stack: TreeNode[] = [];
  let root: TreeNode | null = null;
  let maxDepth = 0;
  let lastHeaderDepth = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    let rawDepth = calculateIndentLevel(line, indentType, indentSize);
    
    // Check if it's a header to update lastHeaderDepth
    const isHeader = trimmed.startsWith('#');
    const isList = /^(\*|-|\+|\d+\.)\s+/.test(trimmed);

    if (isHeader) {
      lastHeaderDepth = rawDepth;
    } else if (lastHeaderDepth !== -1) {
      // Sub-items of a header must be shifted by the header's depth
      // so they properly descend from it without losing their relative hierarchy.
      rawDepth += lastHeaderDepth;
    }
    
    // Depth is relative to the first line
    const currentDepth = Math.max(0, rawDepth - firstLineDepth);

    // Precise content extraction
    let content = '';
    if (isHeader) {
      content = trimmed.replace(/^#+\s*/, '');
    } else {
      // Strip list markers (- , * , + , 1. )
      content = trimmed.replace(/^(\*|-|\+|\d+\.)\s+/, '');
      
      // If no marker found but still has indent, use manual slice
      if (content === trimmed) {
        const indentCharCount = indentType === 'tabs' ? rawDepth : rawDepth * indentSize;
        content = line.substring(indentCharCount);
      }
    }

    if (content.trim().length === 0) continue;

    // Create new node with stable ID based on line index
    const node = createTreeNode(content, currentDepth, `line_${i}`);

    if (!root) {
      root = node;
      stack.push(node);
      continue;
    }

    // Adjust stack based on depth
    // Find parent: the deepest node whose depth is strictly less than currentDepth
    while (stack.length > 0 && stack[stack.length - 1].depth >= currentDepth) {
        stack.pop();
    }
    
    const parent = stack.length > 0 ? stack[stack.length - 1] : root;
    if (parent) {
      node.parent = parent;
      parent.children.push(node);
    } else {
      // Fallback for sibling roots
      node.parent = root;
      root.children.push(node);
    }
    
    stack.push(node);
    maxDepth = Math.max(maxDepth, currentDepth);
  }

  return { root: root!, lineCount: lines.length, maxDepth };
}

/**
 * Validates that indentation levels are consistent and increasing properly
 * @param lines - Array of markdown lines
 * @param indentType - Expected indentation type
 * @param indentSize - Indent size for spaces
 * @returns ValidationResult with any issues found
 */
export function validateTreeStructure(
  lines: string[],
  indentType: IndentationType,
  indentSize: number
): TreeValidationResult {
  const errors: TreeValidationError[] = [];
  const warnings: TreeValidationWarning[] = [];

  if (lines.length === 0) {
    return {
      valid: false,
      errors: [{
        line: -1,
        message: 'Empty input',
      }],
      warnings: [],
    };
  }

  // Check first line is at depth 0
  const firstLineDepth = calculateIndentLevel(lines[0].trimStart(), indentType, indentSize);
  if (firstLineDepth !== 0) {
    errors.push({
      line: 0,
      message: `First line must be at depth 0, found depth ${firstLineDepth}`,
    });
  }

  // Track previous depth to detect jumps
  let previousDepth = firstLineDepth;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      continue;
    }

    const currentDepth = calculateIndentLevel(line, indentType, indentSize);

    // Check for invalid jumps (more than +1)
    if (currentDepth > previousDepth + 1) {
      errors.push({
        line: i,
        message: `Indentation jumped from depth ${previousDepth} to ${currentDepth}. ` +
                 `Depth can only increase by 1 at a time.`,
      });
    }

    // Check for negative depth
    if (currentDepth < 0) {
      errors.push({
        line: i,
        message: 'Invalid indentation (negative depth)',
      });
    }

    previousDepth = currentDepth;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Error class for tree building errors
 */
export class TreeBuildError extends Error {
  line: number;

  constructor(message: string, line: number) {
    super(message);
    this.name = 'TreeBuildError';
    this.line = line;
  }
}

/**
 * Represents a tree validation error
 */
export interface TreeValidationError {
  line: number;
  message: string;
}

/**
 * Represents a tree validation warning
 */
export interface TreeValidationWarning {
  line: number;
  message: string;
}

/**
 * Result of tree structure validation
 */
export interface TreeValidationResult {
  valid: boolean;
  errors: TreeValidationError[];
  warnings: TreeValidationWarning[];
}

/**
 * Counts the total number of nodes in a tree (including root)
 * @param root - Root node of the tree
 * @returns Total node count
 */
export function countNodes(root: TreeNode): number {
  let count = 1; // Count root
  for (const child of root.children) {
    count += countNodes(child);
  }
  return count;
}

/**
 * Finds a node by ID in the tree
 * @param root - Root node of the tree
 * @param id - Node ID to find
 * @returns The found node or undefined
 */
export function findNodeById(root: TreeNode, id: string): TreeNode | undefined {
  if (root.id === id) {
    return root;
  }
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/**
 * Gets all nodes at a specific depth level
 * @param root - Root node of the tree
 * @param depth - Target depth level
 * @returns Array of nodes at the specified depth
 */
export function getNodesAtDepth(root: TreeNode, depth: number): TreeNode[] {
  if (depth < 0) {
    return [];
  }
  if (depth === 0) {
    return [root];
  }
  const result: TreeNode[] = [];
  for (const child of root.children) {
    result.push(...getNodesAtDepth(child, depth));
  }
  return result;
}

/**
 * Gets the depth of a specific node in the tree
 * @param root - Root node of the tree
 * @param target - Node to find
 * @returns Depth of the node, or -1 if not found
 */
export function getNodeDepth(root: TreeNode, target: TreeNode): number {
  if (root.id === target.id) {
    return 0;
  }
  for (const child of root.children) {
    const depth = getNodeDepth(child, target);
    if (depth >= 0) {
      return depth + 1;
    }
  }
  return -1;
}