/**
 * Feature: Search Engine
 * Purpose: Provides high-speed text search over the mind map tree structure
 * Requirement Traceability: 
 * - Req 13: Full-text search with navigation
 * - Design Ref: Search algorithm (O(n) traversal)
 */

import { TreeNode } from '../types/tree-node';

/**
 * Result of a search match
 */
export interface SearchResult {
  nodeId: string;
  matchIndex: number;
  matchLength: number;
  content: string;
}

/**
 * Options for search execution
 */
export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

/**
 * Search Engine for hierarchical tree data
 */
export class SearchEngine {
  /**
   * Task 8.1 / 8.2: Recursively search all nodes using DFS
   * @param root - Root of the tree to search
   * @param query - Search term
   * @param options - Match options
   */
  public static search(
    root: TreeNode, 
    query: string, 
    options: SearchOptions = {}
  ): SearchResult[] {
    if (!query) return [];

    const results: SearchResult[] = [];
    const normalizedQuery = options.caseSensitive ? query : query.toLowerCase();

    // Task 8.2: Depth-first traversal
    const traverse = (node: TreeNode) => {
      const content = node.content || '';
      const searchable = options.caseSensitive ? content : content.toLowerCase();

      let matchIndex = searchable.indexOf(normalizedQuery);
      
      // Handle whole word matches if requested
      if (matchIndex !== -1 && options.wholeWord) {
        const wordRegex = new RegExp(`\\b${normalizedQuery}\\b`, options.caseSensitive ? '' : 'i');
        const match = searchable.match(wordRegex);
        if (match) {
          matchIndex = match.index || -1;
        } else {
          matchIndex = -1;
        }
      }

      if (matchIndex !== -1) {
        results.push({
          nodeId: node.id,
          matchIndex,
          matchLength: query.length,
          content
        });
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(root);
    return results;
  }

  /**
   * Task 8.4: Logic to expand all ancestors of a search result
   * Returns a set of node IDs to expand
   */
  public static getExpansionPath(root: TreeNode, targetId: string): Set<string> {
    const path = new Set<string>();
    
    // DFS to find target and capture its ancestry
    const find = (node: TreeNode, currentPath: string[]): boolean => {
      if (node.id === targetId) {
        currentPath.forEach(id => path.add(id));
        return true;
      }

      if (node.children) {
        for (const child of node.children) {
          if (find(child, [...currentPath, node.id])) {
            return true;
          }
        }
      }
      return false;
    };

    find(root, []);
    return path;
  }
}
