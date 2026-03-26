/**
 * Feature: Transform Command
 * Purpose: Implements undoable pan and zoom operations for the mind map viewport
 * Requirement Traceability: 
 * - Interaction: Viewport navigation (pan/zoom)
 * - Req 6: Undo/Redo support
 */

import { Command } from '../command-interface';
import { StateManager } from '../state-manager';
import { Transform } from '../../types/interfaces';

/**
 * Command for resetting or modifying the zoom/pan state of the viewport
 */
export class TransformCommand implements Command {
  private previousTransform: Transform;
  private newTransform: Transform;
  private stateManager: StateManager;

  constructor(newTransform: Transform, stateManager: StateManager) {
    this.newTransform = newTransform;
    this.stateManager = stateManager;
    this.previousTransform = stateManager.getState().transform;
  }

  /**
   * Applies the new pan/zoom coordinates
   */
  execute(): void {
    this.stateManager.setState({ transform: this.newTransform });
  }

  /**
   * Restores the previous viewport position
   */
  undo(): void {
    this.stateManager.setState({ transform: this.previousTransform });
  }

  get label(): string {
    return `Update Viewport (${Math.round(this.newTransform.scale * 100)}%)`;
  }
}
