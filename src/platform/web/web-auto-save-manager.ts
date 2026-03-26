/**
 * Feature: Auto-Save System
 * Purpose: Provides silent, background saving of mind map state to IndexedDB
 * Dependencies: WebStorageAdapter, StateManager
 */

import { WebStorageAdapter } from './web-storage-adapter';
import { TreeNode, AutoSaveRecord } from '@/core/types';
import { createMarkdownParser, MarkdownParser } from '@/core/parser/markdown-parser';

/**
 * Manages periodic auto-save operations to local storage
 */
export class WebAutoSaveManager {
  private storage = new WebStorageAdapter();
  private parser: MarkdownParser = createMarkdownParser();
  private lastSaveHash: string = '';
  private saveInterval: number = 3000; // 3 seconds
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start auto-save background process
   */
  public start(root: TreeNode, getCurrentFile: () => string): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(async () => {
      const markdown = this.parser.serialize(root);
      if (markdown === this.lastSaveHash) return;

      const record: AutoSaveRecord = {
        markdown: markdown,
        filePath: getCurrentFile(),
        layoutDirection: 'two-sided', // Should be dynamic
        timestamp: new Date(),
      };

      try {
        await this.storage.saveAutoSave(record);
        this.lastSaveHash = markdown;
        console.debug('Auto-save complete');
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, this.saveInterval);
  }

  /**
   * Stop auto-save background process
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Force an immediate save
   */
  public async forceSave(root: TreeNode, filePath: string): Promise<void> {
    const markdown = this.parser.serialize(root);
    const record: AutoSaveRecord = {
      markdown: markdown,
      filePath: filePath,
      layoutDirection: 'two-sided',
      timestamp: new Date(),
    };
    await this.storage.saveAutoSave(record);
    this.lastSaveHash = markdown;
  }
}
