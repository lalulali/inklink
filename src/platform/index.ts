/**
 * Feature: Platform Adapter Factory
 * Purpose: Provides access to platform-specific adapter implementations
 * Dependencies: adapters/ interfaces, web/ implementations
 */

import { StorageAdapter, FileSystemAdapter, RendererAdapter } from './adapters';
import { WebStorageAdapter, WebFileSystemAdapter, D3Renderer } from './web';

import { VSCodeStorageAdapter, VSCodeFileSystemAdapter } from './vscode';

/**
 * Platform environment detection
 */
export enum PlatformType {
  Web = 'web',
  VSCode = 'vscode',
}

/**
 * Factory for retrieving platform-specific adapters
 */
export class PlatformFactory {
  private static instance: PlatformFactory;
  private currentPlatform: PlatformType = PlatformType.Web;

  private constructor() {
    // Detect platform at runtime
    if (typeof window !== 'undefined' && (window as any).acquireVsCodeApi) {
      this.currentPlatform = PlatformType.VSCode;
    } else if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PLATFORM === 'vscode') {
      this.currentPlatform = PlatformType.VSCode;
    }
  }

  /**
   * Get current platform type
   */
  public getPlatform(): PlatformType {
    return this.currentPlatform;
  }

  /**
   * Get singleton factory instance
   */
  public static getInstance(): PlatformFactory {
    if (!PlatformFactory.instance) {
      PlatformFactory.instance = new PlatformFactory();
    }
    return PlatformFactory.instance;
  }

  /**
   * Create storage adapter for the current platform
   */
  public createStorageAdapter(): StorageAdapter {
    switch (this.currentPlatform) {
      case PlatformType.Web:
        return new WebStorageAdapter();
      case PlatformType.VSCode:
        return new VSCodeStorageAdapter();
      default:
        return new WebStorageAdapter();
    }
  }

  /**
   * Create file system adapter for the current platform
   */
  public createFileSystemAdapter(): FileSystemAdapter {
    switch (this.currentPlatform) {
      case PlatformType.Web:
        return new WebFileSystemAdapter();
      case PlatformType.VSCode:
        return new VSCodeFileSystemAdapter();
      default:
        return new WebFileSystemAdapter();
    }
  }

  /**
   * Create renderer adapter for the current platform
   */
  public createRendererAdapter(): RendererAdapter {
    switch (this.currentPlatform) {
      case PlatformType.Web:
        return new D3Renderer();
      case PlatformType.VSCode:
        return new D3Renderer();
      default:
        return new D3Renderer();
    }
  }
}
