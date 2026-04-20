/**
 * Feature: Tree Builder
 * Purpose: Constructs tree structure from markdown lines using stack-based algorithm
 * Dependencies: TreeNode, createTreeNode from core/types/tree-node
 */

import { TreeNode, createTreeNode } from '../types/tree-node';
import type { CodeBlockInfo, QuoteBlockInfo, ImageInfo, TableBlockInfo } from '../types/tree-node';
import {
  IndentationType,
  detectIndentation,
  calculateIndentLevel,
  IndentationError,
} from './indentation';

/**
 * Persistent map from structural path-key → stable node ID.
 * Survives across parses so that nodes keep the same ID as long as
 * their position in the tree is unchanged.
 *
 * Path-key format: "root::0::1" means
 *   - child at index 0 of root, then child at index 1 of that node.
 * The virtual root always uses the key "root".
 */
const _pathToId: Map<string, string> = new Map();

/**
 * Returns the stable ID for a given path-key, creating one if it doesn't exist yet.
 */
function getOrCreateId(pathKey: string): string {
  let id = _pathToId.get(pathKey);
  if (!id) {
    id = `node_${Math.random().toString(36).slice(2, 11)}`;
    _pathToId.set(pathKey, id);
  }
  return id;
}

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
  let isFenced = false;
  let contentStartColumn = 0;

  // Track the child-index counters per parent path-key so we can build stable path-keys.
  // e.g. childIndexOf.get("root") = 2 means root currently has 2 children assigned.
  const childIndexOf: Map<string, number> = new Map();

  // Collect all path-keys used in this parse so we can prune stale entries afterwards.
  const usedPathKeys: Set<string> = new Set();

  for (let i = 0; i < lines.length; i++) {
    const { text: line } = lines[i];
    const trimmed = line.trimStart();
    
    // Toggle fenced state
    if (trimmed.startsWith('```')) {
      isFenced = !isFenced;
      
      // If we just entered/exited a fence, the fence line itself needs to be treated as content
      // unless it's the very first line of a new node.
    }

    // Preserve blank lines inside fenced blocks or nodes; otherwise skip if at top level and empty
    if (trimmed.length === 0 && !isFenced && orphans.length === 0) continue;

    let rawDepth = calculateIndentLevel(line, indentType, indentSize);
    
    // Only detect headers/lists if NOT inside a code block fence
    const isHeader = !isFenced && trimmed.startsWith('#');
    const isList = !isFenced && /^(\*|-|\+|\d+\.)\s+/.test(trimmed);
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
      contentStartColumn = (line.length - trimmed.length) + (trimmed.length - content.length);
    } else if (isList) {
      content = trimmed.replace(/^(\*|-|\+|\d+\.)\s+/, '');
      contentStartColumn = (line.length - trimmed.length) + (trimmed.length - content.length);
    } else if (line.trim().length === 0) {
      content = '';
    } else if (orphans.length === 0 || isInitiator) {
      // This case is for the first line of the tree or any new initiator
      // (though isInitiator is already handled above, kept for clarity)
      content = trimmed;
      contentStartColumn = line.length - trimmed.length;
    } else {
      // Continuation of a node: strip only as much leading whitespace as the node's baseline indentation
      const leadingWhitespace = line.length - line.trimStart().length;
      const stripCount = Math.min(leadingWhitespace, contentStartColumn);
      content = line.substring(stripCount);
    }

    if (content.trim().length === 0 && isInitiator) continue;

    // A node is created if it's an initiator OR if it's the very first line of the tree
    if (isInitiator || orphans.length === 0) {
      // --- Stable ID via path-key ---
      // Determine parent path-key BEFORE modifying the stack.
      let parentPathKey: string;
      if (orphans.length === 0) {
        // This will become the (sole/first) root.
        parentPathKey = '__none__';
      } else {
        // Peek at what the parent will be after popping.
        let peekIdx = stack.length - 1;
        while (peekIdx >= 0 && stack[peekIdx].depth >= currentDepth) {
          peekIdx--;
        }
        parentPathKey = peekIdx >= 0 ? (stack[peekIdx] as any).__pathKey : '__orphan__';
      }

      const siblingIndex = childIndexOf.get(parentPathKey) ?? 0;
      childIndexOf.set(parentPathKey, siblingIndex + 1);

      const pathKey = orphans.length === 0 ? 'root' : `${parentPathKey}::${siblingIndex}`;
      usedPathKeys.add(pathKey);
      const stableId = getOrCreateId(pathKey);

      const node = createTreeNode(content, currentDepth, stableId);
      // Attach the path-key so children can reference it.
      (node as any).__pathKey = pathKey;
      // Store which source line this node originated from (0-based index)
      node.metadata.sourceLine = lines[i].index;
      node.metadata.sourceLineEnd = lines[i].index;

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
      // Append content to current node (including lines inside code blocks)
      let targetNode = stack[stack.length - 1];
      if (targetNode) {
          targetNode.content += '\n' + content;
          targetNode.metadata.sourceLineEnd = lines[i].index;
      } else if (orphans.length > 0) {
          orphans[orphans.length - 1].content += '\n' + content;
          orphans[orphans.length - 1].metadata.sourceLineEnd = lines[i].index;
      }
    }
  }

  if (orphans.length === 0) {
     throw new TreeBuildError('Failed to build tree: no nodes found', -1);
  }

  // Prune stale entries from the persistent path-key map so it doesn't grow unboundedly.
  for (const key of Array.from(_pathToId.keys())) {
    if (!usedPathKeys.has(key)) {
      _pathToId.delete(key);
    }
  }

  // Post-process: extract code/quote blocks and images from every node's content
  const applyExtraction = (node: TreeNode): void => {
    const trimmed = (node.content || '').trim();
    const { cleanContent: afterCode, codeBlocks } = extractCodeBlocks(trimmed);
    const { cleanContent: afterQuote, quoteBlocks } = extractQuoteBlocks(afterCode);
    const { cleanContent: afterMdTable, tableBlocks: mdTableBlocks } = extractTableBlocks(afterQuote);
    const { cleanContent: afterTable, tableBlocks } = extractHtmlTableBlocks(afterMdTable, mdTableBlocks);
    const { cleanContent: afterImage, images } = extractImages(afterTable);
    
    // Support literal \n and \t escape sequences in node content
    // Also trim leading spaces from each line for rich text and HTML tags (as requested)
    node.metadata.displayContent = afterImage
      .split('\n')
      .map(line => line.trimStart())
      .join('\n');

    node.metadata.codeBlocks = codeBlocks;
    node.metadata.quoteBlocks = quoteBlocks;
    node.metadata.tableBlocks = tableBlocks;
    node.metadata.image = images.length > 0 ? images[0] : undefined;
    
    node.children.forEach(applyExtraction);
  };
  orphans.forEach(applyExtraction);

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
 * Extracts markdown images from raw content.
 * Supports:
 * 1. Linked image: [![alt](url)](link)
 * 2. Simple image: ![alt](url)
 * 
 * Note: Crucially requires the '!' prefix for both types.
 */
export function extractImages(raw: string): {
  cleanContent: string;
  images: ImageInfo[];
} {
  const images: ImageInfo[] = [];

  // Mask inline code spans so their contents are never parsed as HTML/markdown
  const inlineCodeStore: string[] = [];
  const masked = raw.replace(/`[^`]*`/g, (match) => {
    const idx = inlineCodeStore.length;
    inlineCodeStore.push(match);
    return `\x00INLINECODE${idx}\x00`;
  });

  // 1. Linked image first (more specific)
  // Regex matches: [![alt](img_url)](link_url)
  let cleanContent = masked.replace(
    /\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g,
    (_match, alt, url, link) => {
      const idx = images.length;
      images.push({ url, alt: alt || undefined, link });
      return `[image:${idx}]`;
    }
  );

  // 2. Simple image
  // Regex matches: ![alt](img_url)
  cleanContent = cleanContent.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, alt, url) => {
      const idx = images.length;
      images.push({ url, alt: alt || undefined });
      return `[image:${idx}]`;
    }
  );

  // 3. HTML image tags
  cleanContent = cleanContent.replace(
    /<(?:img|image)\b[^>]*src=["']([^"']+)["'][^>]*\/?>/gi,
    (_match, url) => {
      const altMatch = _match.match(/alt=["']([^"']+)["']/i);
      const alt = altMatch ? altMatch[1] : undefined;
      const idx = images.length;
      images.push({ url, alt });
      return `[image:${idx}]`;
    }
  );

  // Restore inline code spans
  cleanContent = cleanContent.replace(/\x00INLINECODE(\d+)\x00/g, (_, i) => inlineCodeStore[parseInt(i)]);

  return { cleanContent, images };
}

/**
 * Extracts fenced code blocks from raw content.
 * Replaces each block with a [codeblock:N] placeholder in cleanContent.
 */
export function extractCodeBlocks(raw: string): {
  cleanContent: string;
  codeBlocks: CodeBlockInfo[];
} {
  const codeBlocks: CodeBlockInfo[] = [];
  const cleanContent = raw.replace(
    /```(\w*)[ \t]*\n([\s\S]*?)\n?```/g,
    (_match, lang, code) => {
      const idx = codeBlocks.length;
      // Strip leading and trailing empty lines (similar to space trim but specifically for blocks)
      const trimmedCode = code.replace(/^(\s*[\r\n]+)+/, '').replace(/([\r\n]+\s*)+$/, '');
      codeBlocks.push({ language: lang || '', code: trimmedCode, expanded: false });
      return `[codeblock:${idx}]`;
    }
  );
  return { cleanContent, codeBlocks };
}

/**
 * Extracts blockquote runs from raw content.
 * Replaces each contiguous quote block with a [quoteblock:N] placeholder.
 */
export function extractQuoteBlocks(raw: string): {
  cleanContent: string;
  quoteBlocks: QuoteBlockInfo[];
} {
  const quoteBlocks: QuoteBlockInfo[] = [];
  // Match one or more contiguous lines starting with "> "
  const cleanContent = raw.replace(
    /(?:^|\n)((?:[ \t]*>[ \t]?[^\n]*(?:\n|$))+)/g,
    (match, block) => {
      let text = block
        .split('\n')
        .map((l: string) => {
          const bracketIdx = l.indexOf('>');
          if (bracketIdx === -1) return l;
          const pre = l.substring(0, bracketIdx);
          const post = l.substring(bracketIdx + 1);
          // Remove the first space after '>' if it exists
          return pre + (post.startsWith(' ') ? post.substring(1) : post);
        })
        .join('\n');
      
      // Strip leading and trailing empty lines
      text = text.replace(/^(\s*[\r\n]+)+/, '').replace(/([\r\n]+\s*)+$/, '');

      const idx = quoteBlocks.length;
      quoteBlocks.push({ text, expanded: false });
      // Preserve leading newline if match started with one
      return match.startsWith('\n') ? `\n[quoteblock:${idx}]` : `[quoteblock:${idx}]`;
    }
  );
  return { cleanContent, quoteBlocks };
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
/**
 * Extracts GFM table blocks from raw content.
 */
export function extractTableBlocks(raw: string, existingBlocks: TableBlockInfo[] = []): {
  cleanContent: string;
  tableBlocks: TableBlockInfo[];
} {
  const tableBlocks: TableBlockInfo[] = [...existingBlocks];
  
  const cleanContent = raw.replace(
    /(?:^|\n)((?:[ \t]*\|?[ \t]*[^\n|]+\|[^\n]*\n?)+)/g,
    (match, block) => {
        const lines = block.trim().split('\n').map((l: string) => l.trim()).filter(Boolean);
        if (lines.length < 2) return match;

        const separatorIdx = lines.findIndex((l: string) => 
            /^[ \t]*\|?[ \t]*[:-]*---[:-]*([ \t]*\|[ \t]*[:-]*---[:-]*)*[ \t]*\|?[ \t]*$/.test(l)
        );

        if (separatorIdx === -1) return match;

        let headerLine = '';
        if (separatorIdx > 0) {
            headerLine = lines[separatorIdx - 1];
        }

        const parseRow = (row: string): string[] => {
            let content = row.trim();
            if (content.startsWith('|')) content = content.substring(1);
            if (content.endsWith('|')) content = content.substring(0, content.length - 1);
            return content.split('|').map(s => s.trim());
        };

        const headers = headerLine ? parseRow(headerLine) : [];
        const separator = lines[separatorIdx];
        const sepParts = parseRow(separator);

        const alignments: ('left' | 'center' | 'right')[] = sepParts.map(p => {
            const hasLeft = p.indexOf(':') !== -1 && (p.indexOf('-') === -1 || p.indexOf(':') < p.indexOf('-'));
            const hasRight = p.lastIndexOf(':') !== -1 && (p.lastIndexOf('-') === -1 || p.lastIndexOf(':') > p.lastIndexOf('-'));
            if (hasLeft && hasRight) return 'center';
            if (hasRight) return 'right';
            return 'left';
        });

        const rows: string[][] = [];
        for (let i = separatorIdx + 1; i < lines.length; i++) {
            if (!lines[i].includes('|')) break; 
            rows.push(parseRow(lines[i]));
        }

        const idx = tableBlocks.length;
        tableBlocks.push({ headers, rows, alignments, expanded: false });
        
        const prefix = match.startsWith('\n') ? '\n' : '';
        return `${prefix}[tableblock:${idx}]`;
    }
  );

  return { cleanContent, tableBlocks };
}

/**
 * Extracts HTML table blocks from raw content.
 */
export function extractHtmlTableBlocks(raw: string, existingBlocks: TableBlockInfo[] = []): {
  cleanContent: string;
  tableBlocks: TableBlockInfo[];
} {
  const tableBlocks: TableBlockInfo[] = [...existingBlocks];
  
  // Pattern to match <table>...</table> including any attributes
  const tableRegex = /<table[\s\S]*?>([\s\S]*?)<\/table>/gi;
  
  const cleanContent = raw.replace(tableRegex, (match, tableContent) => {
    const headers: string[] = [];
    const rows: string[][] = [];
    const alignments: ("left" | "center" | "right")[] = [];

    // Helper to extract content from a tag and detect alignment
    const parseTag = (tag: string, content: string, collection: string[], alignArray: ("left" | "center" | "right")[], index?: number) => {
      // PRESERVE HTML tags for rendering (especially b, i, u, br, kbd, mark)
      collection.push(content.trim());

      // Detect alignment from the tag itself
      const alignMatch = tag.match(/align=["'](left|center|right)["']/i) || 
                         tag.match(/style=["'][^"']*text-align:\s*(left|center|right)[^"']*["']/i);
      
      const alignment = (alignMatch ? alignMatch[1].toLowerCase() : "left") as "left" | "center" | "right";
      
      if (index !== undefined) {
        if (!alignArray[index] || alignMatch) alignArray[index] = alignment;
      } else {
        alignArray.push(alignment);
      }
    };

    // 1. Try to find headers from <thead>
    const theadMatch = /<thead[\s\S]*?>([\s\S]*?)<\/thead>/gi.exec(tableContent);
    let theadRowsHtml = "";
    if (theadMatch) {
      theadRowsHtml = theadMatch[1];
      const thRegex = /<th[\s\S]*?>([\s\S]*?)<\/th>/gi;
      let thMatch;
      while ((thMatch = thRegex.exec(theadRowsHtml)) !== null) {
        parseTag(thMatch[0], thMatch[1], headers, alignments);
      }
    }

    // 2. Find rows (tr), excluding those in thead
    const contentToSearch = tableContent.replace(/<thead[\s\S]*?>[\s\S]*?<\/thead>/gi, "");
    const trRegex = /<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(contentToSearch)) !== null) {
      const trInner = trMatch[1];
      const tdRegex = /<td[\s\S]*?>([\s\S]*?)<\/td>/gi;
      const row: string[] = [];
      let tdMatch;
      let colIdx = 0;
      
      while ((tdMatch = tdRegex.exec(trInner)) !== null) {
        parseTag(tdMatch[0], tdMatch[1], row, alignments, colIdx);
        colIdx++;
      }

      if (row.length > 0) {
        rows.push(row);
      }
    }

    // Fallback: if no headers found but we have rows, use first row as header? 
    // No, GFM requires headers so we stay consistent. Most HTML tables with headers use <th> anyway.
    
    // Finalize alignments length
    const maxCols = Math.max(headers.length, ...rows.map(r => r.length));
    while (alignments.length < maxCols) alignments.push("left");

    const idx = tableBlocks.length;
    tableBlocks.push({
      headers,
      rows,
      alignments: alignments.slice(0, maxCols),
      expanded: false
    });

    return `[tableblock:${idx}]`;
  });

  return { cleanContent, tableBlocks };
}
