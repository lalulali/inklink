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

export interface LineInfo {
  text: string;
  index: number;
}

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
 * @param lines - Array of LineInfo objects (non-empty)
 * @param indentType - Detected indentation type
 * @param indentSize - Number of spaces per indentation level
 * @param defaultRootName - Optional name for the virtual root
 * @returns TreeBuildResult containing root node and metadata
 */
export function buildTree(
  lines: LineInfo[],
  indentType: IndentationType,
  indentSize: number,
  defaultRootName: string = 'Mind Map'
): TreeBuildResult {
  if (lines.length === 0) {
    throw new TreeBuildError('Cannot build tree from empty input', -1);
  }

  // Pre-process to find the baseline depth (first non-empty line)
  let firstLineDepth = -1;
  for (const line of lines) {
    if (line.text.trim().length > 0) {
      firstLineDepth = calculateIndentLevel(line.text, indentType, indentSize);
      break;
    }
  }

  const orphans: TreeNode[] = [];
  const stack: TreeNode[] = [];
  let maxDepth = 0;
  let lastHeaderDepth = -1;

  for (let i = 0; i < lines.length; i++) {
    const { text: line, index: originalIndex } = lines[i];
    const trimmed = line.trimStart();
    if (trimmed.length === 0) continue;

    let rawDepth = calculateIndentLevel(line, indentType, indentSize);
    const isHeader = trimmed.startsWith('#');
    const isList = /^(\*|-|\+|\d+\.)\s+/.test(trimmed);
    const isInitiator = isHeader || isList;

    if (isHeader) {
      lastHeaderDepth = rawDepth;
    } else if (lastHeaderDepth !== -1) {
      rawDepth += lastHeaderDepth;
    }
    
    const currentDepth = Math.max(0, rawDepth - firstLineDepth);

    // Precise content extraction
    let content = '';
    if (isHeader) {
      content = trimmed.replace(/^#+\s*/, '');
    } else if (isList) {
      content = trimmed.replace(/^(\*|-|\+|\d+\.)\s+/, '');
    } else {
      const indentCharCount = indentType === 'tabs' ? rawDepth : (line.length - line.trimStart().length);
      content = line.substring(indentCharCount);
    }

    if (content.trim().length === 0 && isInitiator) continue;

    if (isInitiator || orphans.length === 0) {
      // Use original index in the ID for traceability
      const node = createTreeNode(content, currentDepth, `line_${originalIndex}`);

      if (orphans.length === 0) {
        orphans.push(node);
        stack.push(node);
        maxDepth = Math.max(maxDepth, currentDepth);
        continue;
      }

      while (stack.length > 0 && stack[stack.length - 1].depth >= currentDepth) {
        stack.pop();
      }
      
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      if (parent) {
        node.parent = parent;
        parent.children.push(node);
      } else {
        orphans.push(node);
      }
      
      stack.push(node);
      maxDepth = Math.max(maxDepth, currentDepth);
    } else {
      let targetNode = stack[stack.length - 1];
      if (targetNode) {
          targetNode.content += '\n' + content;
      } else if (orphans.length > 0) {
          orphans[orphans.length - 1].content += '\n' + content;
      }
    }
  }

  if (orphans.length === 0) {
     throw new TreeBuildError('Failed to build tree: no nodes found', -1);
  }

  if (orphans.length === 1) {
    const root = orphans[0];
    return { root, lineCount: lines.length, maxDepth };
  }

  // Multiple roots
  const virtualRootName = defaultRootName;
  const virtualRoot = createTreeNode(virtualRootName, 0, 'virtual_root');
  orphans.forEach(o => {
    o.parent = virtualRoot;
    virtualRoot.children.push(o);
    const incrementDepth = (n: TreeNode) => {
        n.depth += 1;
        n.children.forEach(incrementDepth);
    };
    incrementDepth(o);
  });

  return { root: virtualRoot, lineCount: lines.length, maxDepth: maxDepth + 1 };
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

  // Check first line depth
  const firstLineRawDepth = calculateIndentLevel(lines[0], indentType, indentSize);
  // We no longer strictly enforce first line at depth 0, because baseline normalization handles it.
  // But we want it to be a valid depth (non-negative).
  if (firstLineRawDepth < 0) {
    errors.push({
      line: 0,
      message: `Invalid starting line depth: ${firstLineRawDepth}`,
    });
  }

  // Track previous node depth to detect jumps
  let previousNodeDepth = 0; // Normalized baseline is always 0
  const baselineDepth = firstLineRawDepth;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) continue;

    const rawDepth = calculateIndentLevel(line, indentType, indentSize);
    const currentDepth = Math.max(0, rawDepth - baselineDepth);
    
    const isHeader = trimmedLine.startsWith('#');
    const isList = /^(\*|-|\+|\d+\.)\s+/.test(trimmedLine);
    const isInitiator = isHeader || isList;

    // Only validate jumps for node initiators
    if (isInitiator) {
      if (currentDepth > previousNodeDepth + 1) {
        warnings.push({
          line: i,
          message: `Indentation jumped from depth ${previousNodeDepth} to ${currentDepth}. ` +
                   `Depth should ideally only increase by 1 at a time.`,
        });
      }
      previousNodeDepth = currentDepth;
    }

    if (currentDepth < 0) {
      errors.push({
        line: i,
        message: 'Invalid indentation (negative depth)',
      });
    }
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