/**
 * Feature: Keyboard Handler
 * Purpose: Centralizes global keyboard shortcut management for the web platform
 * Dependencies: CommandManager, StateManager
 */

import { CommandManager } from '@/core/state/command-manager';
import { globalState } from '@/core/state/state-manager';
import { PlatformFactory, PlatformType } from '@/platform';

/**
 * Handles global keyboard events and maps them to commands
 */
export class WebKeyboardHandler {
  private commandManager: CommandManager;

  constructor(commandManager: CommandManager) {
    this.commandManager = commandManager;
  }

  /**
   * Start listening for keyboard events
   */
  public initialize(): void {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Stop listening for keyboard events
   */
  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const isMod = e.ctrlKey || e.metaKey;

    // Undo/Redo
    if (isMod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.commandManager.redo();
      } else {
        this.commandManager.undo();
      }
      return;
    }

    // Save / Open / Search etc. are handled by the KeyboardHandler React component
    // to avoid duplicate event dispatching.

    // Search
    if (isMod && e.key.toLowerCase() === 'f') {
      // Handled by SearchPanel component itself, but we could centralize it here
      return;
    }

    // Zoom shortcuts
    if (isMod && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      console.log('Shortcut: Zoom In');
      return;
    }

    if (isMod && e.key === '-') {
      e.preventDefault();
      console.log('Shortcut: Zoom Out');
      return;
    }

    if (isMod && e.key === '0') {
      e.preventDefault();
      console.log('Shortcut: Reset Zoom');
      return;
    }

    // Ignore keystrokes when editing text in CodeMirror or other inputs
    const target = e.target as HTMLElement;
    const isEditorOrInput = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.isContentEditable ||
                            !!target.closest('.cm-editor');

    // Navigation and Interaction
    if (!isMod && !isEditorOrInput) {
      if (e.key === 'Enter') {
        const state = globalState.getState();
        if (state.selectedNode && state.tree) {
          const node = this.findNode(state.tree, state.selectedNode);
          if (node && node.children.length > 0) {
            e.preventDefault();
            node.collapsed = !node.collapsed;
            globalState.setState({ tree: state.tree, isDirty: true });
            return;
          }
        }
      }

      if (e.key.startsWith('Arrow')) {
        const state = globalState.getState();
        if (state.selectedNode && state.tree) {
          const node = this.findNode(state.tree, state.selectedNode);
          if (node) {
            let nextNodeId: string | null = null;
            if (e.key === 'ArrowRight' && !node.collapsed && node.children.length > 0) {
              nextNodeId = node.children[0].id;
            } else if (e.key === 'ArrowLeft' && node.parent) {
              nextNodeId = node.parent.id;
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
               if (node.parent) {
                  const idx = node.parent.children.findIndex((c: any) => c.id === node.id);
                  if (e.key === 'ArrowDown' && idx < node.parent.children.length - 1) {
                     nextNodeId = node.parent.children[idx + 1].id;
                  } else if (e.key === 'ArrowUp' && idx > 0) {
                     nextNodeId = node.parent.children[idx - 1].id;
                  }
               }
            }
            
            if (nextNodeId) {
              e.preventDefault();
              globalState.setState({ selectedNode: nextNodeId });
              const el = document.querySelector(`g.node[data-id="${nextNodeId}"]`) as HTMLElement;
              if (el) el.focus();
              return;
            }
          }
        }
      }
    }
  };

  private findNode(root: any, id: string): any {
    if (root.id === id) return root;
    for (const child of root.children) {
      const found = this.findNode(child, id);
      if (found) return found;
    }
    return null;
  }
}
