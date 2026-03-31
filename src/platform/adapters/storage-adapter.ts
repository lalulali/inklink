/**
 * Feature: Storage Adapter Interface
 * Purpose: Defines interface for platform-specific storage implementations
 * Dependencies: None (core interface)
 */

import type { AutoSaveRecord, UserPreferences } from '@/core/types';

/**
 * Storage adapter interface for platform-agnostic storage operations
 * Implementations: WebStorageAdapter (IndexedDB + LocalStorage), VSCodeStorageAdapter
 */
export interface StorageAdapter {
  /**
   * Save auto-save record for crash recovery
   * @param record - Auto-save record to persist
   */
  saveAutoSave(record: AutoSaveRecord): Promise<void>;

  /**
   * Load auto-save record
   * @param id - Optional ID to load (defaults to 'current')
   * @returns Auto-save record or null if none exists
   */
  loadAutoSave(id?: string): Promise<AutoSaveRecord | null>;

  /**
   * List all stored auto-save records
   */
  listAutoSaves(): Promise<AutoSaveRecord[]>;

  /**
   * Delete a specific auto-save record
   */
  deleteAutoSave(id: string): Promise<void>;

  /**
   * Clear all stored auto-save records (purge)
   */
  clearAllAutoSaves(): Promise<void>;

  /**
   * Clear all auto-saves based on age policy
   */
  cleanupOldAutoSaves(daysOld: number): Promise<void>;

  /**
   * Save user preferences
   * @param prefs - User preferences to persist
   */
  savePreferences(prefs: UserPreferences): Promise<void>;

  /**
   * Load user preferences
   * @returns User preferences or defaults
   */
  loadPreferences(): Promise<UserPreferences>;
}