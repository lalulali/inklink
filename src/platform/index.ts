/**
 * Feature: Platform Adapter Factory
 * Purpose: Provides access to platform-specific adapter implementations
 * Dependencies: adapters/ interfaces, web/ implementations
 */

import { StorageAdapter, FileSystemAdapter, RendererAdapter } from './adapters';
import { WebStorageAdapter, WebFileSystemAdapter, D3Renderer } from './web';

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
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PLATFORM === 'vscode') {
      this.currentPlatform = PlatformType.VSCode;
    }
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
        // VSCodeStorageAdapter not yet implemented
        throw new Error('VSCodeStorageAdapter not yet implemented');
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
        // VSCodeFileSystemAdapter not yet implemented
        throw new Error('VSCodeFileSystemAdapter not yet implemented');
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
        // VSCodeRendererAdapter not yet implemented
        return new D3Renderer(); // Webview renderer is likely d3 too
      default:
        return new D3Renderer();
    }
  }
}
