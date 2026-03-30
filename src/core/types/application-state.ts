/**
 * Feature: ApplicationState Type Definition
 * Purpose: Defines the complete application state structure
 * Dependencies: tree-node.ts, interfaces.ts
 */

import type { TreeNode } from './tree-node';
import type { LayoutDirection, Transform, Notification, FileHandle, Position } from './interfaces';
import { getRandomFunWord } from '../constants/branding';

/**
 * Complete application state
 * Immutable - all updates create new state objects
 */
export interface ApplicationState {
  // Document state
  tree: TreeNode | null;
  markdown: string;
  layoutPositions: Map<string, Position>;

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
  isCanvasSearchOpen: boolean;

  // UI state
  loading: boolean;
  error: string | null;
  notification: Notification | null;
  isDarkMode: boolean;

  // Stable random root name for multi-root scenarios
  currentFallbackRootName: string;

  // Editor Search/Replace state
  isEditorSearchOpen: boolean;
  isEditorReplaceOpen: boolean;
  editorSearchQuery: string;
  editorReplaceQuery: string;
  editorSearchCaseSensitive: boolean;
  editorSearchWholeWord: boolean;
  editorSearchRegex: boolean;
  editorReplacePreserveCase: boolean;
  editorSearchResultsCount: number;
  editorSearchCurrentIndex: number;
}

/**
 * Creates the initial application state
 * @returns Default ApplicationState
 */
export function createInitialState(): ApplicationState {
  return {
    tree: null,
    markdown: '',
    layoutPositions: new Map(),
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
    isCanvasSearchOpen: false,
    loading: false,
    error: null,
    notification: null,
    isDarkMode: false,
    currentFallbackRootName: getRandomFunWord(),
    isEditorSearchOpen: false,
    isEditorReplaceOpen: false,
    editorSearchQuery: '',
    editorReplaceQuery: '',
    editorSearchCaseSensitive: false,
    editorSearchWholeWord: false,
    editorSearchRegex: false,
    editorReplacePreserveCase: false,
    editorSearchResultsCount: 0,
    editorSearchCurrentIndex: -1,
  };
}