/**
 * Feature: Command Interface
 * Purpose: Defines the contract for all undoable and redoable operations
 * Requirement Traceability: 
 * - Req 6: Support undo/redo functionality
 */

/**
 * Interface representing a single undoable operation
 */
export interface Command {
  /**
   * Performs the action and modifies the state
   */
  execute(): void;

  /**
   * Reverses the action and restores the previous state
   */
  undo(): void;

  /**
   * Human-readable label for the command (for UI history)
   */
  label?: string;
}
