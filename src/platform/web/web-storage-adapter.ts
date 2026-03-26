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
        // We only keep one current auto-save record for recovery
        const request = store.put({ ...record, id: 'current' });
        
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
  async loadAutoSave(): Promise<AutoSaveRecord | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUTO_SAVE_STORE, 'readonly');
        const store = transaction.objectStore(AUTO_SAVE_STORE);
        const request = store.get('current');
        
        request.onerror = () => reject(new Error('Failed to load auto-save record'));
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (error) {
      console.error('Storage Error:', error);
      return null;
    }
  }

  /**
   * Clear auto-save record from IndexedDB
   */
  async clearAutoSave(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUTO_SAVE_STORE, 'readwrite');
        const store = transaction.objectStore(AUTO_SAVE_STORE);
        const request = store.delete('current');
        
        request.onerror = () => reject(new Error('Failed to clear auto-save record'));
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Storage Error:', error);
    }
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
      autoSaveInterval: 30000,
      defaultLayout: 'two-sided',
      theme: 'light',
      recentFiles: [],
    };
  }
}
