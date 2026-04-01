/**
 * Feature: Toggle All Visibility Command
 * Purpose: Implements undoable bulk collapse/expand of all nodes
 */

import type { Command } from '../command-interface';
import type { StateManager } from '../state-manager';
import type { TreeNode } from '../../types/tree-node';

export class ToggleAllVisibilityCommand implements Command {
  private collapsed: boolean;
  private stateManager: StateManager;
  private previousTree: TreeNode | null = null;

  constructor(collapsed: boolean, stateManager: StateManager) {
    this.collapsed = collapsed;
    this.stateManager = stateManager;
    const s = stateManager.getState();
    if (s.tree) {
        this.previousTree = this.cloneTree(s.tree);
    }
  }

  execute(): void {
    const s = this.stateManager.getState();
    if (!s.tree) return;

    const newTree = this.cloneTree(s.tree);
    const recursiveSet = (node: TreeNode, level: number) => {
      if (this.collapsed) {
        node.collapsed = level >= 1;
      } else {
        node.collapsed = false;
      }
      if (node.children) node.children.forEach(child => recursiveSet(child, level + 1));
    };

    recursiveSet(newTree, 0);
    this.stateManager.setState({ tree: newTree, isDirty: true });
  }

  private cloneTree(node: TreeNode): TreeNode {
    // Standard shallow clone of the node's top-level properties
    const newNode = { ...node, metadata: { ...node.metadata } };
    
    // We explicitly avoid copying the parent reference to break the circularity
    // The visualization and state manager usually rebuild these on layout anyway
    newNode.parent = null;
    
    if (node.children) {
      newNode.children = node.children.map(child => this.cloneTree(child));
      // Re-establish parent links in the new clone for internal consistency
      newNode.children.forEach(child => {
          child.parent = newNode;
      });
    }
    
    return newNode;
  }

  undo(): void {
    if (this.previousTree) {
      this.stateManager.setState({ tree: this.previousTree, isDirty: true });
    }
  }

  get label(): string {
    return this.collapsed ? 'Collapse All' : 'Expand All';
  }
}
