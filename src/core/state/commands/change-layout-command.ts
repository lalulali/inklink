/**
 * Feature: Change Layout Command
 * Purpose: Implements an undoable layout direction switch
 * Requirement Traceability: 
 * - Req 15: Switch between 5 layout modes
 * - Req 6: Undo/Redo support
 */

import { Command } from '../command-interface';
import { StateManager } from '../state-manager';
import { LayoutDirection } from '../../types/interfaces';

/**
 * Command for changing the mind map layout direction (e.g., Two-Sided to L-R)
 */
export class ChangeLayoutCommand implements Command {
  private oldDirection: LayoutDirection;
  private newDirection: LayoutDirection;
  private stateManager: StateManager;

  constructor(newDirection: LayoutDirection, stateManager: StateManager) {
    this.newDirection = newDirection;
    this.stateManager = stateManager;
    this.oldDirection = stateManager.getState().layoutDirection;
  }

  /**
   * Applies the new layout direction
   */
  execute(): void {
    this.stateManager.setState({ layoutDirection: this.newDirection });
  }

  /**
   * Restores the previous layout direction
   */
  undo(): void {
    this.stateManager.setState({ layoutDirection: this.oldDirection });
  }

  get label(): string {
    return `Change layout to ${this.newDirection}`;
  }
}
