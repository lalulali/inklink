/**
 * Feature: Image Dimension Store
 * Purpose: Asynchronously fetches and caches image dimensions to support layout calculations.
 */

export interface ImageDimensions {
  width: number;
  height: number;
  aspect: number;
}

class ImageDimensionStore {
  private cache: Map<string, ImageDimensions> = new Map();
  private loading: Set<string> = new Set();
  private subscribers: Set<() => void> = new Set();

  /**
   * Subscribe to changes in the store (e.g., when an image finishes loading)
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Returns cached dimensions for a URL, or null if not yet loaded.
   * Triggers an async load if not already in progress.
   */
  getDimensions(url: string): ImageDimensions | null {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    if (!this.loading.has(url)) {
      this.loadImage(url);
    }

    return null;
  }

  /**
   * Returns true if the image is currently being loaded.
   */
  isLoading(url: string): boolean {
    return this.loading.has(url);
  }

  private loadImage(url: string) {
    this.loading.add(url);
    
    // In a browser environment, use the Image object
    const img = new Image();
    
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspect = (width && height) ? width / height : 1;
      
      console.log(`[ImageStore] Loaded: ${url} (${width}x${height})`);
      this.cache.set(url, { width, height, aspect });
      this.loading.delete(url);
      this.notify();
    };
    
    img.onerror = (e) => {
      console.error(`[ImageStore] Error loading: ${url}`, e);
      this.loading.delete(url);
      this.notify();
    };

    img.src = url;
    console.log(`[ImageStore] Loading: ${url}`);
  }

  private notify() {
    this.subscribers.forEach(cb => cb());
  }
}

export const imageDimensionStore = new ImageDimensionStore();
