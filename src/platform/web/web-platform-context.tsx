/**
 * Feature: Web Platform Context
 * Purpose: Centralizes all web platform managers (Storage, FS, Export, AutoSave)
 * Dependencies: Platform adapters, React Context, StateManager
 */

"use client";

import React, { createContext, useContext, useMemo } from 'react';
import { PlatformFactory } from '@/platform';
import { WebExportManager } from './web-export-manager';
import { WebAutoSaveManager } from './web-auto-save-manager';
import { WebFileSystemAdapter } from './web-file-system-adapter';
import { StateManager, globalState } from '@/core/state/state-manager';
import { CommandManager } from '@/core/state/command-manager';
import { WebKeyboardHandler } from './web-keyboard-handler';

/**
 * Interface for all web platform services
 */
export interface WebPlatformServices {
  state: StateManager;
  commands: CommandManager;
  export: WebExportManager;
  autoSave: WebAutoSaveManager;
  keyboard: WebKeyboardHandler;
  fs: WebFileSystemAdapter;
  factory: PlatformFactory;
}

const WebPlatformContext = createContext<WebPlatformServices | null>(null);

/**
 * Provides all platform-specific services to the React component tree
 */
export function WebPlatformProvider({ children }: { children: React.ReactNode }) {
  const services = useMemo(() => {
    const factory = PlatformFactory.getInstance();
    const state = globalState;
    const commands = new CommandManager();
    const exportMgr = new WebExportManager();
    const autoSaveMgr = new WebAutoSaveManager();
    const keyboardHandler = new WebKeyboardHandler(commands);
    const fs = factory.createFileSystemAdapter() as WebFileSystemAdapter;
    
    return {
      state,
      commands,
      export: exportMgr,
      autoSave: autoSaveMgr,
      keyboard: keyboardHandler,
      fs, // Expose fs in services
      factory
    };
  }, []);

  React.useEffect(() => {
    // 1. Initialize keyboard handler
    services.keyboard.initialize();

    // 2. Perform daily cleanup
    services.autoSave.performCleanup();

    // 3. Start background sync
    services.autoSave.start(services.state, services.fs);

    // 4. Check for recovery data
    async function initRecovery() {
      const record = await services.autoSave.checkRecovery();
      if (record) {
        services.state.setState({ 
          recoveryRecord: record, 
          isRecoveryDialogOpen: true 
        });
      }
    }
    
    initRecovery();

    return () => {
      services.keyboard.dispose();
      services.autoSave.stop();
    };
  }, [services]);

  return (
    <WebPlatformContext.Provider value={services}>
      {children}
    </WebPlatformContext.Provider>
  );
}

/**
 * Access web platform services
 */
export function useWebPlatform() {
  const context = useContext(WebPlatformContext);
  if (!context) {
    throw new Error('useWebPlatform must be used within WebPlatformProvider');
  }
  return context;
}
