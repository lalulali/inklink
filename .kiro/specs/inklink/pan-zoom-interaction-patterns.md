# Pan/Zoom Interaction Patterns

This document catalogs the pan and zoom interaction patterns for the Markdown to Mind Map Generator, covering mouse, touch, keyboard, and programmatic controls.

## 1. Overview

Pan and zoom are fundamental interactions for navigating large mind maps. The implementation follows these principles:

- **Smooth animations**: All transitions use easing for natural feel
- **Performance**: 60fps rendering target using requestAnimationFrame
- **Accessibility**: Full keyboard navigation support
- **Consistency**: Same behavior across mouse, touch, and keyboard inputs

## 2. Mouse Interactions

### 2.1 Pan (Drag to Move)

The primary method for panning is clicking and dragging on the canvas:

```typescript
/**
 * Pan interaction handler
 * Activated on mouse drag (left button, no modifiers)
 */
class PanHandler {
  private isPanning = false;
  private startX = 0;
  private startY = 0;
  private startTransformX = 0;
  private startTransformY = 0;

  handleMouseDown = (e: MouseEvent): void => {
    // Only pan with left button, no modifier keys
    if (e.button !== 0 || e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }

    this.isPanning = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startTransformX = this.transform.x;
    this.startTransformY = this.transform.y;

    // Add cursor style
    this.canvas.style.cursor = 'grabbing';
  };

  handleMouseMove = (e: MouseEvent): void => {
    if (!this.isPanning) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    // Apply translation
    this.transform.x = this.startTransformX + dx;
    this.transform.y = this.startTransformY + dy;

    this.applyTransform();
  };

  handleMouseUp = (): void => {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'grab';
      this.recordTransformState(); // For undo/redo
    }
  };
}
```

### 2.2 Zoom (Mouse Wheel)

Zoom is primarily controlled via the mouse wheel:

```typescript
/**
 * Zoom interaction via mouse wheel
 * Supports zoom-in, zoom-out, and zoom-to-cursor
 */
class ZoomHandler {
  private readonly MIN_SCALE = 0.1;  // 10%
  private readonly MAX_SCALE = 4.0;  // 400%

  handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    // Determine zoom direction and magnitude
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(
      this.MIN_SCALE,
      Math.min(this.MAX_SCALE, this.transform.scale * delta)
    );

    // Calculate zoom center (cursor position)
    const rect = this.canvas.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Adjust transform to zoom toward cursor
    const scaleRatio = newScale / this.transform.scale;
    this.transform.x = cursorX - (cursorX - this.transform.x) * scaleRatio;
    this.transform.y = cursorY - (cursorY - this.transform.y) * scaleRatio;
    this.transform.scale = newScale;

    this.applyTransform();
    this.checkBounds(); // Edge detection
  };
}
```

### 2.3 Click to Navigate (Minimap)

Clicking on the minimap navigates to that location:

```typescript
/**
 * Minimap click navigation
 * Click position maps to corresponding position in main canvas
 */
class MinimapNavigation {
  handleMinimapClick = (e: MouseEvent): void => {
    const rect = this.minimap.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap coordinates to canvas coordinates
    const scaleX = this.totalWidth / rect.width;
    const scaleY = this.totalHeight / rect.height;

    const targetX = clickX * scaleX - this.viewport.width / 2;
    const targetY = clickY * scaleY - this.viewport.height / 2;

    // Animate to target position
    this.animateToPosition(targetX, targetY, this.transform.scale);
  };
}
```

## 3. Touch Interactions

### 3.1 Single Touch Pan

Single finger drag pans the canvas:

```typescript
/**
 * Single touch pan handler
 */
class TouchPanHandler {
  private lastTouchX = 0;
  private lastTouchY = 0;

  handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.lastTouchX = touch.clientX;
    this.lastTouchY = touch.clientY;
  };

  handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - this.lastTouchX;
    const dy = touch.clientY - this.lastTouchY;

    this.transform.x += dx;
    this.transform.y += dy;

    this.lastTouchX = touch.clientX;
    this.lastTouchY = touch.clientY;

    this.applyTransform();
  };
}
```

### 3.2 Pinch to Zoom

Two-finger pinch gesture for zooming:

```typescript
/**
 * Pinch-to-zoom handler
 * Calculates scale from distance between two touches
 */
class PinchZoomHandler {
  private initialDistance = 0;
  private initialScale = 1;

  handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 2) return;

    const [touch1, touch2] = e.touches;
    this.initialDistance = this.getDistance(touch1, touch2);
    this.initialScale = this.transform.scale;
  };

  handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length !== 2) return;

    e.preventDefault();

    const [touch1, touch2] = e.touches;
    const currentDistance = this.getDistance(touch1, touch2);

    // Calculate new scale
    const scaleFactor = currentDistance / this.initialDistance;
    const newScale = Math.max(0.1, Math.min(4.0, this.initialScale * scaleFactor));

    // Calculate center point for zoom
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;

    // Apply zoom centered on pinch center
    const scaleRatio = newScale / this.transform.scale;
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = centerX - rect.left;
    const canvasY = centerY - rect.top;

    this.transform.x = canvasX - (canvasX - this.transform.x) * scaleRatio;
    this.transform.y = canvasY - (canvasY - this.transform.y) * scaleRatio;
    this.transform.scale = newScale;

    this.applyTransform();
  };

  private getDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

## 4. Keyboard Interactions

### 4.1 Space + Drag for Pan

Holding space while dragging provides an alternative pan method:

```typescript
/**
 * Space + drag pan handler
 * Provides alternative pan method for trackpad users
 */
class SpacePanHandler {
  private isSpacePressed = false;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  handleKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && !e.repeat) {
      this.isSpacePressed = true;
      this.canvas.style.cursor = 'grab';
    }
  };

  handleKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.isSpacePressed = false;
      if (!this.isDragging) {
        this.canvas.style.cursor = 'default';
      }
    }
  };

  handleMouseDown = (e: MouseEvent): void => {
    if (this.isSpacePressed && e.button === 0) {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    }
  };

  handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    this.transform.x += dx;
    this.transform.y += dy;

    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    this.applyTransform();
  };

  handleMouseUp = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = this.isSpacePressed ? 'grab' : 'default';
    }
  };
}
```

### 4.2 Ctrl/Cmd + Scroll for Zoom

Alternative zoom method using ctrl+scroll:

```typescript
/**
 * Ctrl + scroll zoom handler
 * Provides zoom control for trackpad users
 */
class CtrlScrollZoomHandler {
  handleWheel = (e: WheelEvent): void => {
    // Only handle if ctrl or cmd is pressed
    if (!e.ctrlKey && !e.metaKey) return;

    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(4.0, this.transform.scale * delta));

    // Zoom toward viewport center
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const scaleRatio = newScale / this.transform.scale;
    this.transform.x = centerX - (centerX - this.transform.x) * scaleRatio;
    this.transform.y = centerY - (centerY - this.transform.y) * scaleRatio;
    this.transform.scale = newScale;

    this.applyTransform();
  };
}
```

### 4.3 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Fit mind map to screen |
| `R` | Reset view (center on root, 100% zoom) |
| `1-5` | Switch layout direction |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom to 100% |

```typescript
/**
 * Keyboard shortcut handler for pan/zoom
 */
class KeyboardShortcutHandler {
  private readonly shortcuts: Map<string, () => void> = new Map([
    ['KeyF', () => this.fitToScreen()],
    ['KeyR', () => this.resetView()],
    ['Digit1', () => this.setLayout('two-sided')],
    ['Digit2', () => this.setLayout('left-to-right')],
    ['Digit3', () => this.setLayout('right-to-left')],
    ['Digit4', () => this.setLayout('top-to-bottom')],
    ['Digit5', () => this.setLayout('bottom-to-top')],
    ['Equal', () => this.zoomIn()],
    ['Minus', () => this.zoomOut()],
    ['Digit0', () => this.resetZoom()],
  ]);

  handleKeyDown = (e: KeyboardEvent): void => {
    // Ignore if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const handler = this.shortcuts.get(e.code);
    if (handler) {
      e.preventDefault();
      handler();
    }
  };
}
```

## 5. Smooth Animations

### 5.1 Animation System

All pan/zoom transitions use smooth animations:

```typescript
/**
 * Smooth animation system using requestAnimationFrame
 */
class TransformAnimator {
  private animationFrame: number | null = null;
  private readonly DURATION = 300; // ms
  private readonly EASE = this.easeOutCubic;

  async animateTo(
    targetX: number,
    targetY: number,
    targetScale: number
  ): Promise<void> {
    const startX = this.transform.x;
    const startY = this.transform.y;
    const startScale = this.transform.scale;

    const startTime = performance.now();

    return new Promise((resolve) => {
      const animate = (currentTime: number): void => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / this.DURATION, 1);
        const easedProgress = this.EASE(progress);

        // Interpolate values
        this.transform.x = startX + (targetX - startX) * easedProgress;
        this.transform.y = startY + (targetY - startY) * easedProgress;
        this.transform.scale = startScale + (targetScale - startScale) * easedProgress;

        this.applyTransform();

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  cancel(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}
```

### 5.2 Fit to Screen

```typescript
/**
 * Calculate and animate to fit entire mind map in viewport
 */
async fitToScreen(): Promise<void> {
  const bounds = this.layoutEngine.getBounds(this.rootNode);
  const viewport = this.getViewport();

  // Calculate scale to fit
  const padding = 50;
  const availableWidth = viewport.width - padding * 2;
  const availableHeight = viewport.height - padding * 2;

  const scaleX = availableWidth / bounds.width;
  const scaleY = availableHeight / bounds.height;
  const scale = Math.min(scaleX, scaleY, 1.0); // Don't scale up beyond 100%

  // Calculate centered position
  const targetX = (viewport.width - bounds.width * scale) / 2 - bounds.x * scale;
  const targetY = (viewport.height - bounds.height * scale) / 2 - bounds.y * scale;

  await this.animator.animateTo(targetX, targetY, scale);
}
```

## 6. Edge Detection and Feedback

### 6.1 Boundary Detection

Detect when user pans to edges of the mind map:

```typescript
/**
 * Edge detection for pan boundaries
 */
class EdgeDetector {
  private readonly EDGE_THRESHOLD = 50;

  checkEdges(): { left: boolean; right: boolean; top: boolean; bottom: boolean } {
    const bounds = this.layoutEngine.getBounds(this.rootNode);
    const viewport = this.getViewport();

    // Calculate visible bounds in content coordinates
    const visibleLeft = -this.transform.x / this.transform.scale;
    const visibleRight = (viewport.width - this.transform.x) / this.transform.scale;
    const visibleTop = -this.transform.y / this.transform.scale;
    const visibleBottom = (viewport.height - this.transform.y) / this.transform.scale;

    return {
      left: visibleLeft - bounds.x < this.EDGE_THRESHOLD,
      right: (bounds.x + bounds.width) - visibleRight < this.EDGE_THRESHOLD,
      top: visibleTop - bounds.y < this.EDGE_THRESHOLD,
      bottom: (bounds.y + bounds.height) - visibleBottom < this.EDGE_THRESHOLD,
    };
  }

  /**
   * Apply visual feedback when at edge
   */
  applyEdgeFeedback(): void {
    const edges = this.checkEdges();

    // Add CSS class to indicate edge proximity
    this.canvas.classList.toggle('at-left-edge', edges.left);
    this.canvas.classList.toggle('at-right-edge', edges.right);
    this.canvas.classList.toggle('at-top-edge', edges.top);
    this.canvas.classList.toggle('at-bottom-edge', edges.bottom);
  }
}
```

### 6.2 Visual Feedback Styles

```css
/* Edge feedback styles */
.canvas.at-left-edge {
  box-shadow: inset 10px 0 20px -10px rgba(255, 0, 0, 0.3);
}

.canvas.at-right-edge {
  box-shadow: inset -10px 0 20px -10px rgba(255, 0, 0, 0.3);
}

.canvas.at-top-edge {
  box-shadow: inset 0 10px 20px -10px rgba(255, 0, 0, 0.3);
}

.canvas.at-bottom-edge {
  box-shadow: inset 0 -10px 20px -10px rgba(255, 0, 0, 0.3);
}
```

## 7. Zoom Constraints

### 7.1 Scale Limits

Zoom is constrained between 10% and 400%:

```typescript
/**
 * Zoom constraint enforcer
 */
class ZoomConstraints {
  readonly MIN_SCALE = 0.1;   // 10%
  readonly MAX_SCALE = 4.0;   // 400%
  readonly DEFAULT_SCALE = 1.0;

  /**
   * Clamp scale to valid range
   */
  clampScale(scale: number): number {
    return Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, scale));
  }

  /**
   * Check if at zoom limit (for UI feedback)
   */
  isAtMinScale(): boolean {
    return this.transform.scale <= this.MIN_SCALE;
  }

  isAtMaxScale(): boolean {
    return this.transform.scale >= this.MAX_SCALE;
  }

  /**
   * Get zoom percentage for display
   */
  getZoomPercentage(): number {
    return Math.round(this.transform.scale * 100);
  }
}
```

## 8. Integration with D3.js

### 8.1 D3 Zoom Behavior

The implementation uses D3's zoom behavior as the foundation:

```typescript
/**
 * D3 zoom behavior integration
 */
class D3ZoomIntegration {
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;

  initialize(): void {
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4.0])        // Min/max zoom
      .translateExtent([[-1000, -1000], [1000, 1000]]) // Pan boundaries
      .filter((event) => {
        // Custom filter: disable zoom on ctrl+click (browser zoom)
        if (event.type === 'wheel' && (event.ctrlKey || event.metaKey)) {
          return false;
        }
        return true;
      })
      .on('zoom', this.handleZoom);

    // Apply to SVG
    d3.select(this.svg).call(this.zoom);
  }

  private handleZoom = (event: d3.D3ZoomEvent<SVGSVGElement, unknown>): void => {
    const { transform } = event;

    // Apply transform to main group
    this.contentGroup.attr('transform', transform.toString());

    // Update internal state
    this.transform.x = transform.x;
    this.transform.y = transform.y;
    this.transform.scale = transform.k;

    // Check edges and update UI
    this.edgeDetector.applyEdgeFeedback();
  };
}
```

## 9. State Management

### 9.1 Transform State for Undo/Redo

Pan and zoom state is tracked for undo/redo:

```typescript
/**
 * Transform state manager
 */
class TransformStateManager {
  /**
   * Record current transform for undo
   */
  recordState(): void {
    this.commandManager.execute(new TransformCommand(
      this.transform.x,
      this.transform.y,
      this.transform.scale
    ));
  }

  /**
   * Apply transform from state
   */
  applyTransform(x: number, y: number, scale: number): void {
    this.transform.x = x;
    this.transform.y = y;
    this.transform.scale = scale;
    this.applyToDOM();
  }
}

/**
 * Command for transform undo/redo
 */
class TransformCommand implements Command {
  constructor(
    private x: number,
    private y: number,
    private scale: number
  ) {}

  execute(state: ApplicationState): ApplicationState {
    const previousTransform = state.transform;
    return {
      ...state,
      transform: { x: this.x, y: this.y, scale: this.scale }
    };
  }

  undo(state: ApplicationState): ApplicationState {
    // Store current as previous for redo
    return state; // Handled by command manager
  }
}
```

## 10. Performance Optimization

### 10.1 Lazy Transform Updates

Transform updates are throttled for performance:

```typescript
/**
 * Throttled transform application
 */
class ThrottledTransform {
  private updateScheduled = false;
  private readonly THROTTLE_MS = 16; // ~60fps

  scheduleUpdate(): void {
    if (this.updateScheduled) return;

    this.updateScheduled = true;
    requestAnimationFrame(() => {
      this.applyTransform();
      this.updateScheduled = false;
    });
  }
}
```

### 10.2 Viewport Culling Integration

Pan/zoom triggers lazy rendering:

```typescript
/**
 * Integration with lazy rendering system
 */
class PanZoomLazyRenderIntegration {
  handleTransformChange(): void {
    // Calculate visible viewport in content coordinates
    const viewport = this.getViewportInContentCoords();

    // Update lazy renderer
    this.lazyRenderer.setViewport(viewport);

    // Only render visible nodes
    this.renderer.renderVisibleNodes();
  }
}
```

## 11. Summary

The pan/zoom system provides:

| Interaction | Trigger | Behavior |
|-------------|---------|----------|
| Pan | Mouse drag | Move canvas in drag direction |
| Pan | Touch drag | Move canvas in drag direction |
| Pan | Space + drag | Alternative pan method |
| Zoom | Mouse wheel | Zoom toward cursor |
| Zoom | Ctrl + scroll | Alternative zoom method |
| Zoom | Pinch gesture | Zoom toward pinch center |
| Navigate | Minimap click | Jump to clicked position |
| Fit | `F` key | Animate to fit entire mind map |
| Reset | `R` key | Center on root, 100% zoom |

Key patterns:
- **D3.js zoom behavior** as foundation
- **requestAnimationFrame** for smooth 60fps animations
- **Edge detection** with visual feedback
- **Zoom constraints** (10%-400%)
- **Undo/redo** support via command pattern
- **Lazy rendering** integration for performance