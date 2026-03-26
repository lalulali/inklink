/**
 * Feature: Keyboard Handler
 * Purpose: Centralizes global keyboard shortcut management for the web platform
 * Dependencies: CommandManager, StateManager
 */

import { CommandManager } from '@/core/state/command-manager';
import { globalState } from '@/core/state/state-manager';

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

    // Save
    if (isMod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      // Implementation through command or direct call
      console.log('Shortcut: Save');
      return;
    }

    // Open
    if (isMod && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      console.log('Shortcut: Open');
      return;
    }

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

    // Navigation (Arrow keys)
    if (!isMod && (e.key.startsWith('Arrow') || e.key === 'Tab')) {
      // Handle node navigation
    }
  };
}
