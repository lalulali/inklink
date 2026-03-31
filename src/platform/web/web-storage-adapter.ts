/**
 * Feature: Web Storage Adapter Implementation
 * Purpose: Implements storage adapter using IndexedDB and LocalStorage
 * Dependencies: StorageAdapter interface, core types
 */

import { StorageAdapter } from '../adapters/storage-adapter';
import { AutoSaveRecord, UserPreferences } from '@/core/types';

const DB_NAME = 'inklink_db';
const DB_VERSION = 1;
const AUTO_SAVE_STORE = 'auto_saves';
const PREFS_KEY = 'inklink_preferences';

/**
 * Web implementation of StorageAdapter
 * Uses IndexedDB for heavy auto-save data and LocalStorage for simple preferences
 */
export class WebStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;

  /**
   * Get or initialize IndexedDB instance
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      // Use indexedDB global provided by browser
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(AUTO_SAVE_STORE)) {
          db.createObjectStore(AUTO_SAVE_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Save auto-save record to IndexedDB
   */
  async saveAutoSave(record: AutoSaveRecord): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUTO_SAVE_STORE, 'readwrite');
        const store = transaction.objectStore(AUTO_SAVE_STORE);
        // Use provided id or default to 'current'
        const id = record.id || 'current';
        const request = store.put({ ...record, id });
        
        request.onerror = () => reject(new Error('Failed to save auto-save record'));
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Storage Error:', error);
      throw error;
    }
  }

  /**
   * Load auto-save record from IndexedDB
   */
  async loadAutoSave(id: string = 'current'): Promise<AutoSaveRecord | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUTO_SAVE_STORE, 'readonly');
        const store = transaction.objectStore(AUTO_SAVE_STORE);
        const request = store.get(id);
        
        request.onerror = () => reject(new Error('Failed to load auto-save record'));
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (error) {
      console.error('Storage Error:', error);
      return null;
    }
  }

  /**
   * List all auto-save records
   */
  async listAutoSaves(): Promise<AutoSaveRecord[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUTO_SAVE_STORE, 'readonly');
        const store = transaction.objectStore(AUTO_SAVE_STORE);
        const request = store.getAll();
        
        request.onerror = () => reject(new Error('Failed to list auto-save records'));
        request.onsuccess = () => resolve(request.result || []);
      });
    } catch (error) {
      console.error('Storage Error:', error);
      return [];
    }
  }

  /**
   * Find a record matching a handle or path
   * This is used to reuse session IDs for the same file
   */
  async findMatchingRecord(handle?: FileSystemFileHandle, filePath?: string | null): Promise<AutoSaveRecord | null> {
    try {
      const records = await this.listAutoSaves();
      
      // First pass: Try handle matching (most precise)
      if (handle) {
         for (const record of records) {
           if (record.fileHandle) {
             try {
               if (await (handle as any).isSameEntry(record.fileHandle)) {
                 console.debug('Found record by handle match:', record.id);
                 return record;
               }
             } catch {
               // ignore comparison errors
             }
           }
         }
      }

      // Second pass: Fallback to path matching (works for non-native drops or legacy records)
      if (filePath) {
        for (const record of records) {
          // STRICT ISOLATION: 
          // If a record has a handle, it is "pinned" to a specific physical file.
          // It should ONLY match if Pass 1 (handle comparison) already succeeded.
          // Since we are in Pass 2, it means it didn't match via handle.
          // Therefore, if either the record OR the current drop has a handle, 
          // they are NOT the same file (effectively different "folders" or identities).
          if (record.fileHandle || handle) {
            continue;
          }

          // Both have NO handles (e.g. mobile, Firefox, or non-native drop)
          // Fall back to filename matching as last resort
          if (record.filePath === filePath) {
            console.debug('Found record by path match (both no-handle):', record.id);
            return record;
          }
        }
      }
    } catch (err) {
      console.warn('Matching failed:', err);
    }
    return null;
  }

  /**
   * Delete a specific auto-save record
   */
  async deleteAutoSave(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUTO_SAVE_STORE, 'readwrite');
        const store = transaction.objectStore(AUTO_SAVE_STORE);
        const request = store.delete(id);
        
        request.onerror = () => reject(new Error(`Failed to delete auto-save record: ${id}`));
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Storage Error:', error);
    }
  }

  /**
   * Clear all auto-save records (cleansing)
   */
  async clearAllAutoSaves(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUTO_SAVE_STORE, 'readwrite');
        const store = transaction.objectStore(AUTO_SAVE_STORE);
        const request = store.clear();
        
        request.onerror = () => reject(new Error('Failed to clear auto-save store'));
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Storage Error:', error);
    }
  }

  /**
   * Cleanup old auto-save records
   */
  async cleanupOldAutoSaves(days: number): Promise<void> {
    try {
      const records = await this.listAutoSaves();
      const now = new Date();
      const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

      for (const record of records) {
        if (record.id !== 'current' && new Date(record.timestamp) < cutoff) {
          await this.deleteAutoSave(record.id!);
        }
      }
    } catch (error) {
      console.error('Storage Error during cleanup:', error);
    }
  }

  /**
   * Clear auto-save record from IndexedDB
   */
  async clearAutoSave(id: string = 'current'): Promise<void> {
    return this.deleteAutoSave(id);
  }

  /**
   * Save user preferences to LocalStorage
   */
  async savePreferences(prefs: UserPreferences): Promise<void> {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error('Storage Error:', error);
    }
  }

  /**
   * Load user preferences from LocalStorage
   */
  async loadPreferences(): Promise<UserPreferences> {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (!stored) return this.getDefaultPreferences();
      
      const prefs = JSON.parse(stored);
      return {
        ...this.getDefaultPreferences(),
        ...prefs
      };
    } catch (error) {
      console.error('Storage Error:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      autoSaveEnabled: true,
      autoSaveInterval: 3000,
      autoSaveToFileEnabled: false,
      autoCleanupDays: 30,
      defaultLayout: 'two-sided',
      theme: 'light',
      recentFiles: [],
    };
  }
}
