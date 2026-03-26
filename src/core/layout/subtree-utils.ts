/**
 * Feature: Subtree Size Utils
 * Purpose: Provides utilities for counting nodes in subtrees to assist with balanced layout partitioning
 * Dependencies: TreeNode from core/types/tree-node
 */

import { TreeNode } from '../types/tree-node';

/**
 * Calculates the total number of nodes in each subtree of the given node (including the node itself)
 * Returns a map of node IDs to their total descendant count (including self)
 * 
 * @param node - The root of the tree/subtree to calculate sizes for
 * @returns Map where keys are node IDs and values are total node counts
 */
export function calculateSubtreeSizes(node: TreeNode): Map<string, number> {
  const sizes = new Map<string, number>();

  /**
   * Internal recursive function to traverse the tree and accumulate sizes
   * @param n - Current node being processed
   * @returns Total size of the current subtree
   */
  function traverse(n: TreeNode): number {
    let size = 1; // Count current node
    
    // Recursively count all children
    if (n.children && n.children.length > 0) {
      for (const child of n.children) {
        size += traverse(child);
      }
    }
    
    // Store size for the current node ID
    sizes.set(n.id, size);
    return size;
  }

  traverse(node);
  return sizes;
}

/**
 * Counts the total number of leaf nodes in a subtree
 * Useful for calculating total height required for a branch
 * @param node - Root of the subtree
 * @returns Number of leaf nodes
 */
export function countLeafNodes(node: TreeNode): number {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  
  let leafCount = 0;
  for (const child of node.children) {
    leafCount += countLeafNodes(child);
  }
  return leafCount;
}

/**
 * Calculates the maximum depth of a subtree starting from the given node
 * @param node - Root of the subtree
 * @returns Maximum depth relative to this node (node itself is level 0)
 */
export function calculateMaxDepth(node: TreeNode): number {
  if (!node.children || node.children.length === 0) {
    return 0;
  }
  
  let maxChildDepth = 0;
  for (const child of node.children) {
    maxChildDepth = Math.max(maxChildDepth, calculateMaxDepth(child));
  }
  return 1 + maxChildDepth;
}
/**
 * Partitions child nodes into two groups (left and right) with balanced node counts
 * Uses a greedy algorithm: sorts children by subtree size and assigns each to the smaller side
 * 
 * @param children - Array of first-level child nodes to partition
 * @param sizes - Precalculated map of subtree sizes
 * @returns Object containing left and right partitions
 */
export function partitionChildren(
  children: TreeNode[],
  sizes: Map<string, number>
): { left: TreeNode[]; right: TreeNode[] } {
  // Edge case: no children
  if (!children || children.length === 0) {
    return { left: [], right: [] };
  }

  // Sort children by leaf count (largest first) for optimal greedy packing
  // Height in a mindmap is proportional to the number of leaf nodes in the subtree
  const sorted = [...children].sort((a, b) => {
    const sizeA = countLeafNodes(a);
    const sizeB = countLeafNodes(b);
    return sizeB - sizeA;
  });

  const left: TreeNode[] = [];
  const right: TreeNode[] = [];
  let leftSize = 0;
  let rightSize = 0;

  // Greedy distribution: always add to the side currently carrying fewer leaf nodes
  for (const child of sorted) {
    const childSize = countLeafNodes(child);
    
    if (leftSize <= rightSize) {
      left.push(child);
      leftSize += childSize;
    } else {
      right.push(child);
      rightSize += childSize;
    }
  }

  return { left, right };
}
