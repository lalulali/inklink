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
    
    return {
      state,
      commands,
      export: exportMgr,
      autoSave: autoSaveMgr,
      keyboard: keyboardHandler,
      factory
    };
  }, []);

  React.useEffect(() => {
    services.keyboard.initialize();
    return () => services.keyboard.dispose();
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
