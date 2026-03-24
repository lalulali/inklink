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
   * Load auto-save record for crash recovery
   * @returns Auto-save record or null if none exists
   */
  loadAutoSave(): Promise<AutoSaveRecord | null>;

  /**
   * Clear auto-save record
   */
  clearAutoSave(): Promise<void>;

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