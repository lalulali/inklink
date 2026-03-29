/**
 * Feature: Core Interfaces
 * Purpose: Defines all core interfaces for the application
 * Dependencies: None (core types)
 */

/**
 * Layout direction options
 */
export type LayoutDirection =
  | 'two-sided'
  | 'left-to-right'
  | 'right-to-left';

/**
 * Pan and zoom transformation state
 */
export interface Transform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Viewport dimensions
 */
export interface Viewport {
  width: number;
  height: number;
}

/**
 * Node position
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Bounding box for layout calculations
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * File handle for File System Access API
 */
export interface FileHandle {
  handle?: FileSystemFileHandle;
  path: string;
  name: string;
}

/**
 * Notification for user feedback
 */
export interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validation error with line and column info
 */
export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * Command interface for undo/redo
 * Uses generic type to avoid circular dependency
 */
export interface Command<T = unknown> {
  execute(state: T): T;
  undo(state: T): T;
  description: string;
}

// ApplicationState is defined in application-state.ts

/**
 * Export format options
 */
export type ExportFormat = 'html' | 'svg' | 'png' | 'jpg';

/**
 * Auto-save record for crash recovery
 */
export interface AutoSaveRecord {
  markdown: string;
  filePath: string | null;
  layoutDirection: LayoutDirection;
  timestamp: Date;
}

/**
 * User preferences
 */
export interface UserPreferences {
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  defaultLayout: LayoutDirection;
  theme: 'light' | 'dark';
  recentFiles: string[];
}

/**
 * Node change for renderer updates
 */
export interface NodeChange {
  id: string;
  type: 'add' | 'update' | 'remove';
  // TreeNode is imported at runtime when needed
}

/**
 * Search result
 */
export interface SearchResult {
  nodeId: string;
  matches: string[];
  score: number;
}