/**
 * Feature: Keyboard Handler System
 * Purpose: Centralizes application-level keyboard shortcuts
 * Dependencies: StateManager, CommandManager via hooks
 */

"use client";

import { useEffect } from 'react';
import { globalState } from '@/core/state/state-manager';
import { TreeNode } from '@/core/types';

/**
 * Global keyboard event listener
 * Maps key combinations to application commands
 */
export function KeyboardHandler() {
  useEffect(() => {
    const findNode = (root: TreeNode | null, id: string): TreeNode | null => {
      if (!root) return null;
      if (root.id === id) return root;
      for (const child of root.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
      return null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      
      // Ignore keystrokes when editing text in CodeMirror or other inputs
      const isEditorOrInput = target.tagName === 'INPUT' || 
                              target.tagName === 'TEXTAREA' || 
                              target.isContentEditable ||
                              !!target.closest('.cm-editor');

      if (isEditorOrInput) return;

      // Interaction: Space or Enter to toggle collapse
      if (e.key === ' ' || e.key === 'Enter') {
        const state = globalState.getState();
        if (state.selectedNode && state.tree) {
          const node = findNode(state.tree, state.selectedNode);
          if (node && node.children.length > 0) {
            e.preventDefault();
            node.collapsed = !node.collapsed;
            // Force re-render by creating a new tree object
            globalState.setState({ tree: { ...state.tree }, isDirty: true });
            return;
          }
        }
      }

      /* Navigation: Arrow Keys (PAUSED per user request)
      if (e.key.startsWith('Arrow')) {
        // ... (preserving logic)
      }
      */

      // Block Tab for mind map navigation
      if (e.key === 'Tab') {
          // If we are focused on a node, prevent tab to avoid standard focus jumping
          if (target.closest('g.node')) {
              e.preventDefault();
          }
      }

      // File Operations
      if (isMod && e.key === 's') {
        e.preventDefault();
        console.debug('Command: Save');
      }
      if (isMod && e.key === 'o') {
        e.preventDefault();
        console.debug('Command: Open');
      }

      // View Controls
      if (e.key === 'f' && !isMod) {
        console.debug('Command: Fit to Screen');
      }
      if (e.key === 'r' && !isMod) {
        console.debug('Command: Reset View');
      }
      
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null; // Side-effect only component
}
