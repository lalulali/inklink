import { WebStorageAdapter } from './web-storage-adapter';
import type { TreeNode, AutoSaveRecord } from '@/core/types';
import { createMarkdownParser, type MarkdownParser } from '@/core/parser/markdown-parser';
import type { StateManager } from '@/core/state/state-manager';
import type { WebFileSystemAdapter } from './web-file-system-adapter';
import { globalState } from '@/core/state/state-manager';

/**
 * Manages periodic auto-save operations to local storage and files
 */
export class WebAutoSaveManager {
  public storage = new WebStorageAdapter();
  private parser: MarkdownParser = createMarkdownParser();
  private lastLocalSaveHash: string = '';
  private lastFileSaveHash: string = '';
  private localIntervalId: NodeJS.Timeout | null = null;
  private fileIntervalId: NodeJS.Timeout | null = null;

  /**
   * Start auto-save background processes
   */
  public start(stateManager: StateManager, fileSystem: WebFileSystemAdapter): void {
    if (this.localIntervalId || this.fileIntervalId) return;

    // 1. Local Recovery Sync (Fast)
    // Runs every 3 seconds to ensure crash recovery is up-to-date
    this.localIntervalId = setInterval(async () => {
      const state = stateManager.getState();
      if (!state.tree) return;

      const prefs = await this.storage.loadPreferences();
      if (!prefs.autoSaveEnabled) return;

      const markdown = this.parser.serialize(state.tree);
      if (markdown === this.lastLocalSaveHash) return;

      const record: AutoSaveRecord = {
        markdown: markdown,
        filePath: state.filePath,
        fileHandle: state.currentFile?.handle,
        layoutDirection: state.layoutDirection,
        timestamp: new Date(),
      };

      // Save logic: Use the unique autoSaveId if available.
      // This ensures that two files with the same name are stored separately.
      // If none, default to 'current'.
      const storageId = state.autoSaveId || 'current';
      
      try {
        stateManager.setState({ isSaving: true });
        // Save for general crash recovery
        await this.storage.saveAutoSave({ ...record, id: storageId });
        this.lastLocalSaveHash = markdown;
        
        stateManager.setState({ 
          lastSaved: record.timestamp,
          lastSaveType: 'auto',
          isDirty: false,
          isSaving: false
        });
        console.debug('Local recovery snapshots saved');
      } catch (err) {
        stateManager.setState({ isSaving: false });
        console.error('Local auto-save failed:', err);
      }
    }, 3000);

    // 2. File System Sync (Slow)
    // Runs every 30 seconds if file is active and permissions are granted
    this.fileIntervalId = setInterval(async () => {
      const state = stateManager.getState();
      if (!state.currentFile?.handle || !state.tree || !state.isDirty) return;

      const prefs = await this.storage.loadPreferences();
      if (!prefs.autoSaveToFileEnabled) return;

      const markdown = this.parser.serialize(state.tree);
      if (markdown === this.lastFileSaveHash) {
        console.debug('Skipping file auto-save: No changes detected since last manual/auto save');
        return;
      }

      try {
        stateManager.setState({ isSaving: true });
        // Use the filesystem adapter to perform a background write
        // Note: This relies on the handle already having permissions granted.
        const result = await fileSystem.saveFile(markdown, state.filePath || undefined, state.currentFile.handle);
        
        if (result.status === 'saved') {
          this.lastFileSaveHash = markdown;
          stateManager.setState({ 
            lastSaved: new Date(),
            lastSaveType: 'auto',
            isDirty: false,
            isSaving: false
          });
          console.debug('File auto-save successful');
        } else {
          // If deferred or error, we still clear the 'Saving...' status
          stateManager.setState({ isSaving: false });
          console.debug('File auto-save not committed:', result.status);
        }
      } catch (err) {
        stateManager.setState({ isSaving: false });
        console.error('File auto-save failed:', err);
      }
    }, 30000);
  }

  /**
   * Synchronize hashes to prevent redundant auto-saves after manual actions
   */
  public synchronizeHashes(markdown: string): void {
    this.lastLocalSaveHash = markdown;
    this.lastFileSaveHash = markdown;
    console.debug('Auto-save hashes synchronized');
  }

  /**
   * Stop all auto-save background processes
   */
  public stop(): void {
    if (this.localIntervalId) {
      clearInterval(this.localIntervalId);
      this.localIntervalId = null;
    }
    if (this.fileIntervalId) {
      clearInterval(this.fileIntervalId);
      this.fileIntervalId = null;
    }
  }

  /**
   * Check for existing recovery data
   */
  public async checkRecovery(): Promise<AutoSaveRecord | null> {
    try {
      const records = await this.storage.listAutoSaves();
      if (records.length === 0) return null;
      
      // Sort and find the most recent record
      const sorted = records.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      const latest = sorted[0];

      // Optional: Check if record is too old based on cleanup policy
      const prefs = await this.storage.loadPreferences();
      const now = new Date();
      const ageInDays = (now.getTime() - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24);

      if (ageInDays > prefs.autoCleanupDays) {
        // Automatically purge extremely stale records 
        // Note: In Redux-like world, we might want to stay pure, but this is a side-effect manager
        return null;
      }

      return latest;
    } catch (error) {
      console.error('Check recovery failed:', error);
      return null;
    }
  }

  /**
   * Perform manual cleanup of stale records
   */
  public async performCleanup(): Promise<void> {
    const prefs = await this.storage.loadPreferences();
    await this.storage.cleanupOldAutoSaves(prefs.autoCleanupDays);
  }

  /**
   * High-priority force save for dangerous operations like refreshes or drops
   */
  public async forceSave(root: TreeNode, filePath: string | null = null, autoSaveId: string | null = null): Promise<void> {
    const markdown = this.parser.serialize(root);
    const state = globalState.getState();
    const record: AutoSaveRecord = {
      markdown,
      filePath,
      layoutDirection: 'two-sided',
      timestamp: new Date(),
      fileHandle: state.currentFile?.handle || undefined,
    };
    
    const storageId = autoSaveId || filePath || 'current';
    await this.storage.saveAutoSave({ ...record, id: storageId });
    this.lastLocalSaveHash = markdown;
  }
}
