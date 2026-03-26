/**
 * Feature: Collapse Expand Command
 * Purpose: Implements undoable node visibility toggling
 * Requirement Traceability: 
 * - Req 6: Undo/Redo support
 * - Interaction: Child branch visibility management
 */

import { Command } from '../command-interface';
import { StateManager } from '../state-manager';
import { TreeNode } from '../../types/tree-node';

/**
 * Command for collapsing or expanding a branch in the mind map
 */
export class CollapseExpandCommand implements Command {
  private nodeId: string;
  private shouldCollapse: boolean;
  private stateManager: StateManager;

  constructor(nodeId: string, shouldCollapse: boolean, stateManager: StateManager) {
    this.nodeId = nodeId;
    this.shouldCollapse = shouldCollapse;
    this.stateManager = stateManager;
  }

  /**
   * Toggles the collapsed state of the target node
   */
  execute(): void {
    this.updateNodeState(this.shouldCollapse);
  }

  /**
   * Reverses the toggle
   */
  undo(): void {
    this.updateNodeState(!this.shouldCollapse);
  }

  /**
   * Deeply updates the node property within the immutable tree structure
   */
  private updateNodeState(collapsed: boolean): void {
    const currentState = this.stateManager.getState();
    if (!currentState.tree) return;

    // We clone the tree to maintain immutability effectively during state update
    // In a production app, a more efficient lens/immutable approach would be used
    const newTree = { ...currentState.tree };
    const node = this.findNode(newTree, this.nodeId);
    
    if (node) {
      node.collapsed = collapsed;
      this.stateManager.setState({ tree: newTree });
    }
  }

  private findNode(root: TreeNode, id: string): TreeNode | null {
    if (root.id === id) return root;
    if (root.children) {
      for (const child of root.children) {
        const found = this.findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  get label(): string {
    return this.shouldCollapse ? 'Collapse Branch' : 'Expand Branch';
  }
}
