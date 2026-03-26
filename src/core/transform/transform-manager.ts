/**
 * Feature: Transform Manager
 * Purpose: Provides mathematical utilities for viewport pan, zoom, and fit-to-screen logic
 * Requirement Traceability: 
 * - Req 7: Interaction Support (Viewport Navigation)
 * - Design Ref: Transform Manager (Portability: Math only)
 */

import { Transform, Viewport, BoundingBox } from '../types/interfaces';

/**
 * Pure utility class for calculating viewport transformations
 * Constrains zoom between 10% and 400%
 */
export class TransformManager {
  public static readonly MIN_ZOOM = 0.1;
  public static readonly MAX_ZOOM = 4.0;
  private static readonly DEFAULT_PADDING = 40;

  /**
   * Calculates a shift in the viewport position
   * @param current - Current transform state
   * @param dx - Horizontal delta in pixels
   * @param dy - Vertical delta in pixels
   */
  public static pan(current: Transform, dx: number, dy: number): Transform {
    return {
      ...current,
      x: current.x + dx,
      y: current.y + dy
    };
  }

  /**
   * Calculates a zoom transformation centered on a specific screen point
   * @param current - Current transform state
   * @param factor - Zoom multiplier (e.g. 1.1 for zoom in, 0.9 for zoom out)
   * @param centerX - Screen X coordinate to zoom towards
   * @param centerY - Screen Y coordinate to zoom towards
   */
  public static zoom(
    current: Transform,
    factor: number,
    centerX: number,
    centerY: number
  ): Transform {
    let newScale = current.scale * factor;
    
    // Task 7.4: Constrain zoom levels
    newScale = Math.min(Math.max(newScale, this.MIN_ZOOM), this.MAX_ZOOM);
    
    const actualFactor = newScale / current.scale;
    
    // Task 7.3: Center preservation logic (linear scaling from focal point)
    return {
      x: centerX - (centerX - current.x) * actualFactor,
      y: centerY - (centerY - current.y) * actualFactor,
      scale: newScale
    };
  }

  /**
   * Task 7.5: Calculates the transform required to fit the entire map content in the viewport
   */
  public static calculateZoomToFit(
    viewport: Viewport,
    bounds: BoundingBox,
    padding = this.DEFAULT_PADDING
  ): Transform {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    
    if (contentWidth <= 0 || contentHeight <= 0) {
      return { x: viewport.width / 2, y: viewport.height / 2, scale: 1 };
    }

    const availableWidth = viewport.width - padding * 2;
    const availableHeight = viewport.height - padding * 2;
    
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    
    // Choose the smaller scale to ensure both dimensions fit
    let scale = Math.min(scaleX, scaleY);
    
    // Task 7.10: Constrain scale within limits
    scale = Math.min(Math.max(scale, this.MIN_ZOOM), 1.5); 

    // Calculate center of the content in model space
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    // Screen Center = (Model Center * Scale) + Transform
    // So: Transform = Screen Center - (Model Center * Scale)
    return {
      x: viewport.width / 2 - centerX * scale,
      y: viewport.height / 2 - centerY * scale,
      scale
    };
  }

  /**
   * Linearly interpolates between two transforms for animation frames
   * Task 7.6: Animation support (used by platform-specific loops)
   */
  public static lerp(start: Transform, end: Transform, t: number): Transform {
    // Clamp t to [0, 1]
    const clampedT = Math.max(0, Math.min(1, t));
    
    return {
      x: start.x + (end.x - start.x) * clampedT,
      y: start.y + (end.y - start.y) * clampedT,
      scale: start.scale + (end.scale - start.scale) * clampedT
    };
  }

  /**
   * Task 7.7: Calculate world-space viewport bounds
   */
  public static calculateViewportBounds(viewport: Viewport, transform: Transform): BoundingBox {
    return {
      minX: -transform.x / transform.scale,
      maxX: (-transform.x + viewport.width) / transform.scale,
      minY: -transform.y / transform.scale,
      maxY: (-transform.y + viewport.height) / transform.scale
    };
  }
}
