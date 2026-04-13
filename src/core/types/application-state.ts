/**
 * Feature: ApplicationState Type Definition
 * Purpose: Defines the complete application state structure
 * Dependencies: tree-node.ts, interfaces.ts
 */

import type { TreeNode } from './tree-node';
import type { LayoutDirection, Transform, Notification, FileHandle, Position, AutoSaveRecord, UserPreferences } from './interfaces';
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
  lastSaveType: 'manual' | 'auto' | null;
  isSaving: boolean;

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

  // Permission state
  filePermissionRequest: { handle: FileSystemFileHandle; path: string } | null;

  // Export state
  isExportDialogOpen: boolean;
  isHelpDialogOpen: boolean;
  isLearnBasicsOpen: boolean;
  isSettingsDialogOpen: boolean;

  // Recovery state
  recoveryRecord: AutoSaveRecord | null;
  isRecoveryDialogOpen: boolean;
  autoSaveId: string | null;

  // Editor status (history context)
  editorCanUndo: boolean;
  editorCanRedo: boolean;

  // Preferences (Local Storage sync)
  preferences: UserPreferences;
  // Layout State
  isResizing: boolean;
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
    lastSaveType: null,
    isSaving: false,
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
    filePermissionRequest: null,
    isExportDialogOpen: false,
    isHelpDialogOpen: false,
    isLearnBasicsOpen: false,
    isSettingsDialogOpen: false,
    recoveryRecord: null,
    isRecoveryDialogOpen: false,
    autoSaveId: typeof crypto !== 'undefined' ? crypto.randomUUID() : null,
    editorCanUndo: false,
    editorCanRedo: false,
    isResizing: false,
    preferences: {
      autoSaveEnabled: true,
      autoSaveInterval: 3000,
      autoSaveToFileEnabled: true,
      autoCleanupDays: 3,
      defaultLayout: 'two-sided',
      theme: 'dark',
      recentFiles: [],
    },
  };
}