/**
 * Feature: Keyboard Handler System
 * Purpose: Centralizes application-level keyboard shortcuts
 * Dependencies: StateManager, CommandManager via hooks
 */

"use client";

import { useEffect } from 'react';
import { globalState } from '@/core/state/state-manager';
import { TreeNode } from '@/core/types';
import { PlatformFactory, PlatformType } from '@/platform';

/**
 * Global keyboard event listener
 * Maps key combinations to application commands
 */
export function KeyboardHandler() {
  useEffect(() => {
    const findAndToggle = (root: TreeNode | null, id: string, collapsed: boolean): boolean => {
      if (!root) return false;
      if (root.id === id) {
        if (root.collapsed === collapsed) return false;
        root.collapsed = collapsed;
        return true;
      }
      return root.children.some(child => findAndToggle(child, id, collapsed));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const target = e.target as HTMLElement;
      const key = e.key.toLowerCase();

      // --- 1. CRITICAL GLOBAL OVERRIDES (Handled regardless of focus) ---
      
      // Search (Canvas Find Node) - Cmd+F (Not Shift)
      if (isMod && !isShift && key === 'f') {
        e.preventDefault();
        globalState.setState({ isCanvasSearchOpen: true });
        return;
      }

      // Search (Editor Find) - Cmd+Shift+F
      if (isMod && isShift && key === 'f') {
        e.preventDefault();
        globalState.setState({ isEditorSearchOpen: true, isEditorReplaceOpen: false });
        return;
      }

      // Replace (Editor) - Cmd+Shift+H
      if (isMod && isShift && key === 'h') {
        e.preventDefault();
        globalState.setState({ isEditorSearchOpen: true, isEditorReplaceOpen: true });
        return;
      }

      // File: Save / Open Editor (VS Code) - Cmd/Ctrl + S
      if (isMod && key === 's') {
        const factory = PlatformFactory.getInstance();
        const isVsCode = factory.getPlatform() === PlatformType.VSCode;
        
        e.preventDefault();
        if (isVsCode) {
            window.dispatchEvent(new CustomEvent('inklink-editor-toggle'));
        } else {
            window.dispatchEvent(new CustomEvent('inklink-file-save'));
        }
        return;
      }

      // File: Open - Cmd/Ctrl + O
      if (isMod && key === 'o') {
        const factory = PlatformFactory.getInstance();
        const isVsCode = factory.getPlatform() === PlatformType.VSCode;
        
        if (isVsCode) {
            // Let VS Code handle native Open
            return;
        }
        
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('inklink-file-open'));
        return;
      }

      // Export - Cmd/Ctrl + E
      if (isMod && key === 'e') {
        e.preventDefault();
        globalState.setState({ isExportDialogOpen: true });
        return;
      }
      
      // --- 2. FOCUS PROTECTION ---
      const isEditorOrInput = target.tagName === 'INPUT' || 
                              target.tagName === 'TEXTAREA' || 
                              target.isContentEditable ||
                              !!target.closest('.cm-editor');

      if (isEditorOrInput) return;

      // --- 3. CANVAS-SPECIFIC INTERNALS ---

      // Toggle Editor - 'E'
      if (!isMod && key === 'e') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('inklink-editor-toggle'));
      }

      // Expand/Collapse - 'X' / 'C'
      if (!isMod && (key === 'x' || key === 'c')) {
         const state = globalState.getState();
         if (!state.tree) return;
         e.preventDefault();
         const isCollapse = key === 'c';

         if (state.selectedNode) {
            // Target specific node
            if (findAndToggle(state.tree, state.selectedNode, isCollapse)) {
               globalState.setState({ tree: { ...state.tree }, isDirty: true });
            }
         } else {
            // Target ALL nodes if no selection
            const recursiveSet = (node: any) => {
               node.collapsed = isCollapse;
               if (node.children) node.children.forEach(recursiveSet);
            };
            const newTree = { ...state.tree };
            recursiveSet(newTree);
            globalState.setState({ tree: newTree, isDirty: true });
         }
      }

      // Layout Controls - Cmd/Ctrl + Arrows
      if (isMod) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          globalState.setState({ layoutDirection: 'right-to-left' });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          globalState.setState({ layoutDirection: 'left-to-right' });
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          globalState.setState({ layoutDirection: 'two-sided' });
        }
      }

      // Selection: Enter to toggle (Legacy)
      if (e.key === 'Enter') {
        const state = globalState.getState();
        if (state.selectedNode && state.tree) {
          const isCurrentlyCollapsed = (node: any): boolean => {
              if (node.id === state.selectedNode) return node.collapsed;
              return node.children.some(isCurrentlyCollapsed);
          };
          const targetState = !isCurrentlyCollapsed(state.tree);
          if (findAndToggle(state.tree, state.selectedNode, targetState)) {
            globalState.setState({ tree: { ...state.tree }, isDirty: true });
          }
        }
      }

      // View Controls
      if (key === 'f' && !isMod) {
        window.dispatchEvent(new CustomEvent('inklink-fit-view'));
      }
      if (key === 'r' && !isMod) {
        window.dispatchEvent(new CustomEvent('inklink-reset-view'));
      }
      if (e.key === '?' && !isMod) {
        e.preventDefault();
        globalState.setState({ isHelpDialogOpen: true });
      }

      // Interaction: Escape to unselect
      if (e.key === 'Escape') {
        const state = globalState.getState();
        if (state.selectedNode) {
          globalState.setState({ selectedNode: null });
        }
        if (state.isCanvasSearchOpen) {
          globalState.setState({ isCanvasSearchOpen: false });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null; // Side-effect only component
}
