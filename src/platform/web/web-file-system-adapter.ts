/**
 * Feature: Web FileSystem Adapter Implementation
 * Purpose: Implements file system adapter using File System Access API with fallbacks
 * Dependencies: FileSystemAdapter interface, core types
 */

import { FileSystemAdapter, FileContent } from '../adapters/filesystem-adapter';

const RECENT_FILES_KEY = 'inklink_recent_files';

/**
 * Web implementation of FileSystemAdapter
 * Prioritizes File System Access API for seamless saving, fallbacks to input/download
 */
export class WebFileSystemAdapter implements FileSystemAdapter {
  /**
   * Open a file from the user's system
   * Uses showOpenFilePicker if available, falls back to input element
   */
  async openFile(): Promise<FileContent> {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'Markdown files',
            accept: { 'text/markdown': ['.md'] },
          }],
        });
        const file = await handle.getFile();
        const content = await file.text();
        return {
          content,
          path: file.name,
          handle,
        };
      } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        return this.fallbackOpenFile();
      }
    } else {
      return this.fallbackOpenFile();
    }
  }

  /**
   * Save content to a file
   * Uses showSaveFilePicker if available, falls back to download
   */
  async saveFile(content: string, path?: string, handle?: any): Promise<void> {
    if (handle && 'createWritable' in handle) {
      try {
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return;
      } catch (error) {
        console.warn('Silent save failed, following to save as dialog', error);
      }
    }

    if ('showSaveFilePicker' in window) {
      try {
        const newHandle = await (window as any).showSaveFilePicker({
          suggestedName: path || 'mindmap.md',
          types: [{
            description: 'Markdown files',
            accept: { 'text/markdown': ['.md'] },
          }],
        });
        const writable = await newHandle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        this.fallbackSaveFile(content, path || 'mindmap.md');
      }
    } else {
      this.fallbackSaveFile(content, path || 'mindmap.md');
    }
  }

  /**
   * Get recently opened/saved files
   */
  async getRecentFiles(): Promise<string[]> {
    try {
      const stored = localStorage.getItem(RECENT_FILES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('State Error:', error);
      return [];
    }
  }

  /**
   * Add a file to the recent files list
   */
  async addRecentFile(path: string): Promise<void> {
    try {
      const recent = await this.getRecentFiles();
      const filtered = recent.filter(r => r !== path);
      const updated = [path, ...filtered].slice(0, 10);
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('State Error:', error);
    }
  }

  /**
   * Fallback for opening files using standard input element
   */
  private async fallbackOpenFile(): Promise<FileContent> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) {
          const content = await file.text();
          resolve({ content, path: file.name });
        } else {
          reject(new Error('No file selected'));
        }
      };
      input.onerror = (e) => reject(e);
      input.click();
    });
  }

  /**
   * Fallback for saving files using download mechanism
   */
  private fallbackSaveFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
