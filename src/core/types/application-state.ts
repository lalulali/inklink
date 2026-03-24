/**
 * Feature: ApplicationState Type Definition
 * Purpose: Defines the complete application state structure
 * Dependencies: tree-node.ts, interfaces.ts
 */

import type { TreeNode } from './tree-node';
import type { LayoutDirection, Transform, Notification, FileHandle } from './interfaces';

/**
 * Complete application state
 * Immutable - all updates create new state objects
 */
export interface ApplicationState {
  // Document state
  tree: TreeNode | null;
  markdown: string;

  // File state
  currentFile: FileHandle | null;
  filePath: string | null;
  isDirty: boolean;
  lastSaved: Date | null;

  // View state
  layoutDirection: LayoutDirection;
  transform: Transform;
  minimapVisible: boolean;

  // Interaction state
  selectedNode: string | null;
  searchQuery: string;
  searchResults: string[];
  currentSearchIndex: number;

  // UI state
  loading: boolean;
  error: string | null;
  notification: Notification | null;
}

/**
 * Creates the initial application state
 * @returns Default ApplicationState
 */
export function createInitialState(): ApplicationState {
  return {
    tree: null,
    markdown: '',
    currentFile: null,
    filePath: null,
    isDirty: false,
    lastSaved: null,
    layoutDirection: 'two-sided',
    transform: {
      x: 0,
      y: 0,
      scale: 1,
    },
    minimapVisible: true,
    selectedNode: null,
    searchQuery: '',
    searchResults: [],
    currentSearchIndex: -1,
    loading: false,
    error: null,
    notification: null,
  };
}