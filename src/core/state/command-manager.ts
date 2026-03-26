/**
 * Feature: Command Manager
 * Purpose: Manages a history (stacks) of undoable operations using the Command Pattern
 * Requirement Traceability: 
 * - Req 6: Full undo/redo functionality
 */

import { Command } from './command-interface';

/**
 * Orchestrates the execution of state commands and their lifetime in a history stack
 */
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  
  // Depth limit for history to avoid memory bloat
  private readonly maxStackSize = 50;

  /**
   * Pushes a new command onto the undo stack and clears the redo stack
   * Task 6.4: Command history management
   */
  execute(command: Command): void {
    // Perform the operation immediately
    command.execute();
    
    // Maintain undo/redo history
    this.undoStack.push(command);
    
    // Clear the redo stack, as new actions break the forward linear history
    this.redoStack = [];
    
    // Enforce limits to prevent memory leaks in long sessions
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }
  
  /**
   * Reverses the most recent action on the undo stack
   */
  undo(): void {
    const cmd = this.undoStack.pop();
    if (cmd) {
      cmd.undo();
      this.redoStack.push(cmd);
    }
  }
  
  /**
   * Replays the most recently undone action
   */
  redo(): void {
    const cmd = this.redoStack.pop();
    if (cmd) {
      cmd.execute();
      this.undoStack.push(cmd);
    }
  }

  /**
   * Clears the entire history stack for session resets or file closes
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
  
  /**
   * Helper indices for UI state
   */
  hasUndo(): boolean { return this.undoStack.length > 0; }
  hasRedo(): boolean { return this.redoStack.length > 0; }

  /**
   * Retrieves the current list of command labels for debugging or history UI
   */
  getHistory(): { undo: string[], redo: string[] } {
    return {
      undo: this.undoStack.map(c => c.label || 'Unnamed Command'),
      redo: this.redoStack.map(c => c.label || 'Unnamed Command')
    };
  }
}

// Global instance for application-wide command management
export const commandManager = new CommandManager();
