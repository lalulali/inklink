/**
 * Feature: Layout Factory
 * Purpose: Provides a single point of entry for creating and switching between layout algorithms
 * Dependencies: LayoutDirection from core/types/interfaces, Specific Layout implementations
 */

import { LayoutDirection } from '../types/interfaces';
import { LayoutAlgorithm } from './layout-interface';
import { TwoSidedLayout } from './two-sided-layout';
import { LeftToRightLayout } from './left-to-right-layout';
import { RightToLeftLayout } from './right-to-left-layout';
import { TopToBottomLayout } from './top-to-bottom-layout';
import { BottomToTopLayout } from './bottom-to-top-layout';

/**
 * Factory class to instantiate layout algorithms based on requested direction
 */
export class LayoutFactory {
  /**
   * Creates a layout algorithm instance for the specified direction
   * @param direction - The requested mind map growth direction
   * @param config - Optional spacing overrides
   * @returns An implementation of the LayoutAlgorithm interface
   */
  static create(
    direction: LayoutDirection,
    config?: { nodeSpacing?: number; levelSpacing?: number }
  ): LayoutAlgorithm {
    switch (direction) {
      case 'left-to-right':
        return new LeftToRightLayout(config);
      case 'right-to-left':
        return new RightToLeftLayout(config);
      case 'top-to-bottom':
        return new TopToBottomLayout(config);
      case 'bottom-to-top':
        return new BottomToTopLayout(config);
      case 'two-sided':
      default:
        return new TwoSidedLayout(config);
    }
  }
}
