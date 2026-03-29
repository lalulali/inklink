/**
 * Feature: State Manager
 * Purpose: Centralizes application state management using the Observer pattern for state-driven updates
 * Requirement Traceability: 
 * - Req 6: Support state-changing operations
 * - Req 12: Maintain consistent state updates
 */

import { ApplicationState, createInitialState } from '../types/application-state';

/**
 * State listener callback signature
 */
export type StateListener = (state: ApplicationState) => void;

/**
 * Central state store implementing the Observer pattern
 */
export class StateManager {
  private state: ApplicationState;
  private listeners: Set<StateListener> = new Set();
  
  constructor(initialState?: ApplicationState) {
    this.state = initialState ?? createInitialState();
  }
  
  /**
   * Retrieves the current immutable snapshot of the state
   */
  getState(): ApplicationState {
    return this.state;
  }
  
  /**
   * Updates the state and notifies all subscribers
   * Task 6.2: State immutability with object spreading
   */
  setState(newState: Partial<ApplicationState>): void {
    const prevState = this.state;
    this.state = { ...this.state, ...newState };
    
    // Task 6.2: Persistence logic
    if (newState.layoutDirection && prevState.layoutDirection !== newState.layoutDirection) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('inklink_layout_direction', newState.layoutDirection);
        }
    }

    // Only notify if changes actually occurred
    if (this.state !== prevState) {
      this.notify();
    }
  }
  
  /**
   * Subscribes to state updates and returns an unsubscribe function
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notifies all registered listeners of a state change
   */
  private notify(): void {
    this.listeners.forEach(listen => listen(this.state));
  }
}

// Global instance (can be used as a singleton in simple contexts)
export const globalState = new StateManager();
