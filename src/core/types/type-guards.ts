/**
 * Feature: Type Guards for Runtime Type Checking
 * Purpose: Provides runtime type validation for all core types
 * Dependencies: tree-node.ts, application-state.ts, interfaces.ts
 * Security: Validates input data to prevent type-related runtime errors
 */

import type {
  TreeNode,
  NodeMetadata,
  ApplicationState,
  Transform,
  Viewport,
  Position,
  BoundingBox,
  FileHandle,
  Notification,
  ValidationResult,
  ValidationError,
  Command,
  LayoutDirection,
  ExportFormat,
  AutoSaveRecord,
  UserPreferences,
  NodeChange,
  SearchResult,
} from './index';

/**
 * Type guard for TreeNode
 * Validates that an object has all required TreeNode properties
 * SECURITY: Prevents invalid tree structures from causing runtime errors
 * 
 * @param value - Value to check
 * @returns True if value is a valid TreeNode
 */
export function isTreeNode(value: unknown): value is TreeNode {
  if (value === null || value === undefined) {
    return false;
  }

  const node = value as Record<string, unknown>;

  // Check required primitive properties
  if (typeof node.id !== 'string' || node.id.length === 0) {
    return false;
  }
  if (typeof node.content !== 'string') {
    return false;
  }
  if (typeof node.depth !== 'number' || node.depth < 0) {
    return false;
  }
  if (typeof node.collapsed !== 'boolean') {
    return false;
  }
  if (typeof node.color !== 'string') {
    return false;
  }

  // Check children array
  if (!Array.isArray(node.children)) {
    return false;
  }

  // Validate parent can be null or TreeNode
  if (node.parent !== null && !isTreeNode(node.parent)) {
    return false;
  }

  // Validate metadata
  if (!isNodeMetadata(node.metadata)) {
    return false;
  }

  // Recursively validate all children
  for (const child of node.children) {
    if (!isTreeNode(child)) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for NodeMetadata
 * Validates rendering and interaction metadata
 * 
 * @param value - Value to check
 * @returns True if value is a valid NodeMetadata
 */
export function isNodeMetadata(value: unknown): value is NodeMetadata {
  if (value === null || value === undefined) {
    return false;
  }

  const metadata = value as Record<string, unknown>;

  // Check required numeric properties
  if (typeof metadata.x !== 'number' || !isFinite(metadata.x)) {
    return false;
  }
  if (typeof metadata.y !== 'number' || !isFinite(metadata.y)) {
    return false;
  }
  if (typeof metadata.width !== 'number' || metadata.width < 0) {
    return false;
  }
  if (typeof metadata.height !== 'number' || metadata.height < 0) {
    return false;
  }

  // Check boolean properties
  if (typeof metadata.visible !== 'boolean') {
    return false;
  }
  if (typeof metadata.highlighted !== 'boolean') {
    return false;
  }

  return true;
}

/**
 * Type guard for ApplicationState
 * Validates complete application state structure
 * SECURITY: Ensures state integrity for undo/redo operations
 * 
 * @param value - Value to check
 * @returns True if value is a valid ApplicationState
 */
export function isApplicationState(value: unknown): value is ApplicationState {
  if (value === null || value === undefined) {
    return false;
  }

  const state = value as Record<string, unknown>;

  // Check document state
  if (state.tree !== null && !isTreeNode(state.tree)) {
    return false;
  }
  if (typeof state.markdown !== 'string') {
    return false;
  }

  // Check file state
  if (state.currentFile !== null && !isFileHandle(state.currentFile)) {
    return false;
  }
  if (state.filePath !== null && typeof state.filePath !== 'string') {
    return false;
  }
  if (typeof state.isDirty !== 'boolean') {
    return false;
  }
  if (state.lastSaved !== null && !(state.lastSaved instanceof Date)) {
    return false;
  }

  // Check view state
  if (!isLayoutDirection(state.layoutDirection)) {
    return false;
  }
  if (!isTransform(state.transform)) {
    return false;
  }
  if (typeof state.minimapVisible !== 'boolean') {
    return false;
  }

  // Check interaction state
  if (state.selectedNode !== null && typeof state.selectedNode !== 'string') {
    return false;
  }
  if (typeof state.searchQuery !== 'string') {
    return false;
  }
  if (!Array.isArray(state.searchResults)) {
    return false;
  }
  for (const id of state.searchResults) {
    if (typeof id !== 'string') {
      return false;
    }
  }
  if (typeof state.currentSearchIndex !== 'number' || state.currentSearchIndex < -1) {
    return false;
  }

  // Check UI state
  if (typeof state.loading !== 'boolean') {
    return false;
  }
  if (state.error !== null && typeof state.error !== 'string') {
    return false;
  }
  if (state.notification !== null && !isNotification(state.notification)) {
    return false;
  }

  return true;
}

/**
 * Type guard for Transform
 * Validates pan and zoom transformation state
 * 
 * @param value - Value to check
 * @returns True if value is a valid Transform
 */
export function isTransform(value: unknown): value is Transform {
  if (value === null || value === undefined) {
    return false;
  }

  const transform = value as Record<string, unknown>;

  // Check numeric properties with validation constraints
  if (typeof transform.x !== 'number' || !isFinite(transform.x)) {
    return false;
  }
  if (typeof transform.y !== 'number' || !isFinite(transform.y)) {
    return false;
  }
  if (typeof transform.scale !== 'number' || !isFinite(transform.scale)) {
    return false;
  }

  // Zoom scale should be within reasonable bounds (0.01 to 100)
  if (transform.scale < 0.01 || transform.scale > 100) {
    return false;
  }

  return true;
}

/**
 * Type guard for Viewport
 * Validates viewport dimensions
 * 
 * @param value - Value to check
 * @returns True if value is a valid Viewport
 */
export function isViewport(value: unknown): value is Viewport {
  if (value === null || value === undefined) {
    return false;
  }

  const viewport = value as Record<string, unknown>;

  if (typeof viewport.width !== 'number' || viewport.width <= 0) {
    return false;
  }
  if (typeof viewport.height !== 'number' || viewport.height <= 0) {
    return false;
  }

  return true;
}

/**
 * Type guard for Position
 * Validates 2D position coordinates
 * 
 * @param value - Value to check
 * @returns True if value is a valid Position
 */
export function isPosition(value: unknown): value is Position {
  if (value === null || value === undefined) {
    return false;
  }

  const position = value as Record<string, unknown>;

  if (typeof position.x !== 'number' || !isFinite(position.x)) {
    return false;
  }
  if (typeof position.y !== 'number' || !isFinite(position.y)) {
    return false;
  }

  return true;
}

/**
 * Type guard for BoundingBox
 * Validates bounding box with min/max coordinates
 * 
 * @param value - Value to check
 * @returns True if value is a valid BoundingBox
 */
export function isBoundingBox(value: unknown): value is BoundingBox {
  if (value === null || value === undefined) {
    return false;
  }

  const box = value as Record<string, unknown>;

  if (typeof box.minX !== 'number' || !isFinite(box.minX)) {
    return false;
  }
  if (typeof box.minY !== 'number' || !isFinite(box.minY)) {
    return false;
  }
  if (typeof box.maxX !== 'number' || !isFinite(box.maxX)) {
    return false;
  }
  if (typeof box.maxY !== 'number' || !isFinite(box.maxY)) {
    return false;
  }

  // Validate min <= max
  if (box.minX > box.maxX || box.minY > box.maxY) {
    return false;
  }

  return true;
}

/**
 * Type guard for FileHandle
 * Validates file system handle structure
 * 
 * @param value - Value to check
 * @returns True if value is a valid FileHandle
 */
export function isFileHandle(value: unknown): value is FileHandle {
  if (value === null || value === undefined) {
    return false;
  }

  const handle = value as Record<string, unknown>;

  if (typeof handle.path !== 'string' || handle.path.length === 0) {
    return false;
  }
  if (typeof handle.name !== 'string' || handle.name.length === 0) {
    return false;
  }

  // handle.handle is optional and can be FileSystemFileHandle
  if (handle.handle !== undefined && handle.handle !== null) {
    // Basic check for FileSystemFileHandle-like object
    const fsHandle = handle.handle as Record<string, unknown>;
    if (typeof fsHandle.kind !== 'string' || fsHandle.kind !== 'file') {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for Notification
 * Validates notification structure
 * 
 * @param value - Value to check
 * @returns True if value is a valid Notification
 */
export function isNotification(value: unknown): value is Notification {
  if (value === null || value === undefined) {
    return false;
  }

  const notification = value as Record<string, unknown>;

  const validTypes = ['success', 'error', 'warning', 'info'];
  if (!validTypes.includes(notification.type as string)) {
    return false;
  }

  if (typeof notification.message !== 'string' || notification.message.length === 0) {
    return false;
  }

  if (notification.duration !== undefined) {
    if (typeof notification.duration !== 'number' || notification.duration < 0) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for ValidationResult
 * Validates validation result structure
 * 
 * @param value - Value to check
 * @returns True if value is a valid ValidationResult
 */
export function isValidationResult(value: unknown): value is ValidationResult {
  if (value === null || value === undefined) {
    return false;
  }

  const result = value as Record<string, unknown>;

  if (typeof result.valid !== 'boolean') {
    return false;
  }

  if (!Array.isArray(result.errors)) {
    return false;
  }
  for (const error of result.errors) {
    if (!isValidationError(error)) {
      return false;
    }
  }

  if (!Array.isArray(result.warnings)) {
    return false;
  }
  for (const warning of result.warnings) {
    if (!isValidationError(warning)) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for ValidationError
 * Validates validation error structure
 * 
 * @param value - Value to check
 * @returns True if value is a valid ValidationError
 */
export function isValidationError(value: unknown): value is ValidationError {
  if (value === null || value === undefined) {
    return false;
  }

  const error = value as Record<string, unknown>;

  if (typeof error.message !== 'string' || error.message.length === 0) {
    return false;
  }

  if (error.line !== undefined) {
    if (typeof error.line !== 'number' || error.line < 1) {
      return false;
    }
  }

  if (error.column !== undefined) {
    if (typeof error.column !== 'number' || error.column < 1) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for Command
 * Validates command structure for undo/redo
 * SECURITY: Ensures command integrity for state management
 * 
 * @param value - Value to check
 * @returns True if value is a valid Command
 */
export function isCommand<T>(value: unknown): value is Command<T> {
  if (value === null || value === undefined) {
    return false;
  }

  const command = value as Record<string, unknown>;

  if (typeof command.execute !== 'function') {
    return false;
  }
  if (typeof command.undo !== 'function') {
    return false;
  }
  if (typeof command.description !== 'string' || command.description.length === 0) {
    return false;
  }

  return true;
}

/**
 * Type guard for LayoutDirection
 * Validates layout direction string
 * 
 * @param value - Value to check
 * @returns True if value is a valid LayoutDirection
 */
export function isLayoutDirection(value: unknown): value is LayoutDirection {
  if (typeof value !== 'string') {
    return false;
  }

  const validDirections: LayoutDirection[] = [
    'two-sided',
    'left-to-right',
    'right-to-left',
    'top-to-bottom',
    'bottom-to-top',
  ];

  return validDirections.includes(value as LayoutDirection);
}

/**
 * Type guard for ExportFormat
 * Validates export format string
 * 
 * @param value - Value to check
 * @returns True if value is a valid ExportFormat
 */
export function isExportFormat(value: unknown): value is ExportFormat {
  if (typeof value !== 'string') {
    return false;
  }

  const validFormats: ExportFormat[] = ['html', 'svg', 'png', 'jpg'];
  return validFormats.includes(value as ExportFormat);
}

/**
 * Type guard for AutoSaveRecord
 * Validates auto-save record structure
 * 
 * @param value - Value to check
 * @returns True if value is a valid AutoSaveRecord
 */
export function isAutoSaveRecord(value: unknown): value is AutoSaveRecord {
  if (value === null || value === undefined) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.markdown !== 'string') {
    return false;
  }

  if (record.filePath !== null && typeof record.filePath !== 'string') {
    return false;
  }

  if (!isLayoutDirection(record.layoutDirection)) {
    return false;
  }

  if (!(record.timestamp instanceof Date)) {
    return false;
  }

  return true;
}

/**
 * Type guard for UserPreferences
 * Validates user preferences structure
 * 
 * @param value - Value to check
 * @returns True if value is a valid UserPreferences
 */
export function isUserPreferences(value: unknown): value is UserPreferences {
  if (value === null || value === undefined) {
    return false;
  }

  const prefs = value as Record<string, unknown>;

  if (typeof prefs.autoSaveEnabled !== 'boolean') {
    return false;
  }

  if (typeof prefs.autoSaveInterval !== 'number' || prefs.autoSaveInterval < 1) {
    return false;
  }

  if (!isLayoutDirection(prefs.defaultLayout)) {
    return false;
  }

  const validThemes = ['light', 'dark'];
  if (!validThemes.includes(prefs.theme as string)) {
    return false;
  }

  if (!Array.isArray(prefs.recentFiles)) {
    return false;
  }
  for (const file of prefs.recentFiles) {
    if (typeof file !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for NodeChange
 * Validates node change structure for renderer updates
 * 
 * @param value - Value to check
 * @returns True if value is a valid NodeChange
 */
export function isNodeChange(value: unknown): value is NodeChange {
  if (value === null || value === undefined) {
    return false;
  }

  const change = value as Record<string, unknown>;

  if (typeof change.id !== 'string' || change.id.length === 0) {
    return false;
  }

  const validTypes = ['add', 'update', 'remove'];
  if (!validTypes.includes(change.type as string)) {
    return false;
  }

  return true;
}

/**
 * Type guard for SearchResult
 * Validates search result structure
 * 
 * @param value - Value to check
 * @returns True if value is a valid SearchResult
 */
export function isSearchResult(value: unknown): value is SearchResult {
  if (value === null || value === undefined) {
    return false;
  }

  const result = value as Record<string, unknown>;

  if (typeof result.nodeId !== 'string' || result.nodeId.length === 0) {
    return false;
  }

  if (!Array.isArray(result.matches)) {
    return false;
  }
  for (const match of result.matches) {
    if (typeof match !== 'string') {
      return false;
    }
  }

  if (typeof result.score !== 'number' || result.score < 0) {
    return false;
  }

  return true;
}

/**
 * Utility type guard for unknown values
 * Checks if value is a non-null object
 * 
 * @param value - Value to check
 * @returns True if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Utility type guard for string arrays
 * Validates array contains only strings
 * 
 * @param value - Value to check
 * @returns True if value is a string array
 */
export function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => typeof item === 'string');
}

/**
 * Utility type guard for number arrays
 * Validates array contains only numbers
 * 
 * @param value - Value to check
 * @returns True if value is a number array
 */
export function isNumberArray(value: unknown): value is number[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => typeof item === 'number');
}

/**
 * Validates a complete tree structure
 * SECURITY: Ensures tree integrity before rendering
 * 
 * @param root - Root node to validate
 * @returns ValidationResult with any errors found
 */
export function validateTree(root: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!isTreeNode(root)) {
    errors.push({
      message: 'Invalid tree structure: root is not a valid TreeNode',
    });
    return { valid: false, errors, warnings };
  }

  // Check for circular references
  const visited = new Set<string>();
  const validateNoCircular = (node: TreeNode, path: string[]): void => {
    if (visited.has(node.id)) {
      errors.push({
        message: `Circular reference detected at node: ${node.content}`,
        line: node.metadata.visible ? undefined : undefined, // Can't determine line without parser context
      });
      return;
    }

    visited.add(node.id);
    path.push(node.id);

    for (const child of node.children) {
      validateNoCircular(child, path);
    }

    path.pop();
  };

  validateNoCircular(root, []);

  // Check depth limits
  const maxDepth = 100;
  const checkDepth = (node: TreeNode, currentDepth: number): void => {
    if (currentDepth > maxDepth) {
      errors.push({
        message: `Maximum nesting depth exceeded (${maxDepth}) at node: ${node.content}`,
      });
      return;
    }

    for (const child of node.children) {
      checkDepth(child, currentDepth + 1);
    }
  };

  checkDepth(root, 0);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}