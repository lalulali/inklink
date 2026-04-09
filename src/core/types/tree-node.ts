/**
 * Feature: TreeNode Type Definition
 * Purpose: Defines the tree node structure for mind map representation
 * Dependencies: None (core type)
 */

/**
 * Represents a single node in the mind map tree structure
 * Corresponds to one line in the markdown document
 */
export interface TreeNode {
  id: string;
  content: string;
  depth: number;
  children: TreeNode[];
  parent: TreeNode | null;
  collapsed: boolean;
  color: string;
  metadata: NodeMetadata;
}

/**
 * A fenced code block extracted from a node's content
 */
export interface CodeBlockInfo {
  language: string;   // e.g. "typescript", "" = unknown
  code: string;       // raw multiline code content
  expanded: boolean;  // display state (in-memory only, not persisted)
}

/**
 * A blockquote extracted from a node's content
 */
export interface QuoteBlockInfo {
  text: string;       // plain text, may be multiline
  expanded: boolean;  // display state (in-memory only)
}

/**
 * A table extracted from a node's content
 */
export interface TableBlockInfo {
  headers: string[];
  rows: string[][];
  alignments: ('left' | 'center' | 'right')[];
  expanded: boolean;
}

/**
 * Information about a parsed markdown image
 */
export interface ImageInfo {
  url: string;
  alt?: string;
  link?: string;
  width?: number;        // Original width
  height?: number;       // Original height
  aspect?: number;       // Aspect ratio (width / height)
  thumbWidth?: number;   // Calculated thumbnail width
  thumbHeight?: number;  // Calculated thumbnail height
}

/**
 * Additional metadata for rendering and interaction
 */
export interface NodeMetadata {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  highlighted: boolean;
  image?: ImageInfo;
  codeBlocks?: CodeBlockInfo[];
  quoteBlocks?: QuoteBlockInfo[];
  tableBlocks?: TableBlockInfo[];
  displayContent?: string;
}

/**
 * Creates a new TreeNode with default values
 * @param content - Text content from markdown
 * @param depth - Indentation level (0 = root)
 * @param id - Optional stable ID
 * @returns New TreeNode instance
 */
export function createTreeNode(content: string, depth: number, id?: string): TreeNode {
  return {
    id: id || generateId(),
    content,
    depth,
    children: [],
    parent: null,
    collapsed: false,
    color: '',
    metadata: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      visible: true,
      highlighted: false,
      codeBlocks: [],
      quoteBlocks: [],
      tableBlocks: [],
    },
  };
}

/**
 * Generates a unique ID for tree nodes
 * @returns Unique string identifier
 */
function generateId(): string {
  return `node_${Math.random().toString(36).substr(2, 9)}`;
}