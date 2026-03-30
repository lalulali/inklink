/**
 * Feature: FileSystem Adapter Interface
 * Purpose: Defines interface for platform-specific file system operations
 * Dependencies: None (core interface)
 */

/**
 * File content result
 */
export interface FileContent {
  content: string;
  path: string;
  handle?: any;
}

/**
 * Result of a save operation
 */
export interface SaveResult {
  status: 'saved' | 'deferred' | 'cancelled' | 'error';
  file?: FileContent;
  message?: string;
}

/**
 * FileSystem adapter interface for platform-agnostic file operations
 * Implementations: WebFileSystemAdapter (File System Access API), VSCodeFileSystemAdapter
 */
export interface FileSystemAdapter {
  /**
   * Open a file from the file system
   * @returns File content and metadata
   */
  openFile(): Promise<FileContent>;

  /**
   * Save content to a file
   * @param content - File content to save
   * @param path - Optional file path (for "Save As")
   * @param handle - Optional file handle (for quick re-save)
   * @returns SaveResult indicating success or status
   */
  saveFile(content: string, path?: string, handle?: any): Promise<SaveResult>;

  /**
   * Get list of recent files
   * @returns Array of file paths
   */
  getRecentFiles(): Promise<string[]>;

  /**
   * Add a file to the recent files list
   * @param path - File path to add
   */
  addRecentFile(path: string): Promise<void>;
}