/**
 * Feature: Collision Detection Algorithm
 * Purpose: Ensures that no two nodes in the mind map overlap, providing an automated way to resolve layout conflicts
 * Dependencies: TreeNode types, Position/BoundingBox interfaces from core/types
 */

import { TreeNode } from '../types/tree-node';
import { Position, BoundingBox } from '../types/interfaces';

/**
 * Checks if two bounding boxes overlap
 * @param box1 - First bounding box
 * @param box2 - Second bounding box
 * @param padding - Optional extra spacing to maintain between boxes
 * @returns True if boxes overlap
 */
export function isOverlapping(box1: BoundingBox, box2: BoundingBox, padding: number = 0): boolean {
  return !(
    box1.maxX + padding < box2.minX ||
    box1.minX - padding > box2.maxX ||
    box1.maxY + padding < box2.minY ||
    box1.minY - padding > box2.maxY
  );
}

/**
 * Calculates a bounding box for a node at a specific position
 * Uses metadata width/height or defaults if not provided
 * @param node - The tree node
 * @param position - The current calculated position
 * @returns BoundingBox for the node
 */
export function getNodeBounds(node: TreeNode, position: Position): BoundingBox {
  const width = node.metadata.width || 120; // Default estimate
  const height = node.metadata.height || 40; // Default estimate
  
  return {
    minX: position.x - width / 2,
    maxX: position.x + width / 2,
    minY: position.y - height / 2,
    maxY: position.y + height / 2,
  };
}

/**
 * Detects all collisions in the current layout
 * @param nodes - Flat list of all nodes in the tree
 * @param positions - Map of node IDs to positions
 * @param padding - Minimum required distance between nodes
 * @returns Array of node ID pairs that are colliding
 */
export function detectCollisions(
  nodes: TreeNode[],
  positions: Map<string, Position>,
  padding: number = 20
): Array<[string, string]> {
  const collisions: Array<[string, string]> = [];
  const boxes = new Map<string, BoundingBox>();

  // Pre-calculate all boxes
  for (const node of nodes) {
    const pos = positions.get(node.id);
    if (pos) {
      boxes.set(node.id, getNodeBounds(node, pos));
    }
  }

  // Check every pair (O(n^2) - okay for ~1000 nodes, but could be optimized with spatial hashing)
  const nodeIds = Array.from(boxes.keys());
  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const id1 = nodeIds[i];
      const id2 = nodeIds[j];
      const box1 = boxes.get(id1)!;
      const box2 = boxes.get(id2)!;

      if (isOverlapping(box1, box2, padding)) {
        collisions.push([id1, id2]);
      }
    }
  }

  return collisions;
}

/**
 * Simple collision resolver that shifts nodes vertically to remove overlaps
 * Note: This is a basic implementation; more complex layouts might need iterative relaxation
 * @param nodes - nodes list
 * @param positions - Current positions (will be modified)
 * @param padding - Minimum required distance
 */
export function resolveVerticalCollisions(
  nodes: TreeNode[],
  positions: Map<string, Position>,
  padding: number = 20
): Map<string, Position> {
  const newPositions = new Map(positions);
  const collisions = detectCollisions(nodes, newPositions, padding);

  if (collisions.length === 0) return newPositions;

  // Group collisions by X coordinate (likely siblings or branches)
  // For each column of nodes, sort by Y and ensure minimum spacing
  const columns = new Map<number, string[]>();
  for (const node of nodes) {
    const pos = newPositions.get(node.id);
    if (pos) {
      const nodesInCol = columns.get(pos.x) || [];
      nodesInCol.push(node.id);
      columns.set(pos.x, nodesInCol);
    }
  }

  for (const [x, ids] of columns.entries()) {
    // Sort nodes in this 'column' by their current Y
    ids.sort((a, b) => newPositions.get(a)!.y - newPositions.get(b)!.y);

    for (let i = 0; i < ids.length - 1; i++) {
      const id1 = ids[i];
      const id2 = ids[i + 1];
      const node1 = nodes.find(n => n.id === id1)!;
      const node2 = nodes.find(n => n.id === id2)!;
      const pos1 = newPositions.get(id1)!;
      const pos2 = newPositions.get(id2)!;
      
      const box1 = getNodeBounds(node1, pos1);
      const box2 = getNodeBounds(node2, pos2);

      if (isOverlapping(box1, box2, padding)) {
        // Shift node2 down relative to node1
        const requiredY = box1.maxY + padding + (node2.metadata.height || 40) / 2;
        const shift = requiredY - pos2.y;
        
        // This is a naive shift - in a real layout, this would also propagate to children
        newPositions.set(id2, { x: pos2.x, y: requiredY });
      }
    }
  }

  return newPositions;
}
