# Image Support Implementation Plan

This document outlines the detailed steps required to implement the "Image" feature for both Web and VS Code versions of Inklink.

## 1. Centralized Configuration
Modify `src/core/layout/layout-config.ts` to include image and distance labeling constraints.

```typescript
export const LAYOUT_CONFIG = {
  // ... existing configs
  
  // Image Thumbnail Constraints
  IMAGE: {
    MAX_WIDTH: 180,
    MAX_HEIGHT: 120,
    PADDING: 4,
    CORNER_RADIUS: 4,
    BORDER_WIDTH: 1.5,
  },

  // Distance Marker Configuration
  DISTANCE: {
    FONT_SIZE: 11,
    COLOR: '#94a3b8', // Slate 400
    BG_OPACITY: 0.8,
  },
};
```

## 2. Core Model Updates
Update the data structures to support image metadata.

- **File**: `src/core/types/tree-node.ts`
- **Actions**:
    - Add `ImageInfo` interface.
    - Update `NodeMetadata` to include `image?: ImageInfo`.

## 3. Markdown Parser Enhancements
Add logic to extract image patterns from the content string.

- **File**: `src/core/parser/tree-builder.ts`
- **Regex Patterns**:
    - Image only: `!\[(?<alt>.*?)\]\((?<url>.*?)\)`
    - Image with link: `\[\!\[(?<alt>.*?)\]\((?<url>.*?)\)\]\((?<link>.*?)\)`
- **Logic**:
    - Extract image info during node creation.
    - Store the extracted data in `node.metadata.image`.
    - Strip the image syntax from the final `node.content` used for text rendering.

## 4. D3 Rendering & Layout
This involves updating the measurement and drawing phases.

### A. Node Measurement
- **File**: `src/platform/web/d3-renderer.ts`
- **Logic**: In the `render()` method where `maxWidth` and `height` are computed:
    - If `node.image` exists, calculate thumbnail size using the following rules:
        - Whichever dimension hits the maximum threshold (IMAGE.MAX_WIDTH or IMAGE.MAX_HEIGHT) first, the other will follow to preserve aspect ratio.
        - If the maximum height is reached first, auto-calculate the width (ignoring the max width constraint).
        - If the maximum width is reached first, auto-calculate the height (ignoring the max height constraint).
        - If the image is smaller than both `IMAGE.MAX_WIDTH` and `IMAGE.MAX_HEIGHT`, use the original image size.
    - Add the thumbnail height + padding to the total node height.
    - Update node width to `max(textWidth, thumbWidth)`.

### B. Image Rendering
- Add a new `<g class="image-container">` inside each node.
- Append an `<image>` element.
- Position the image at the top of the node, followed by the text below it.

<example>
#1
text ![]() --> rendered as [text] [image]

#2
![]() ![]() --> rendered as [image] [image]

#3
![]()\n![]() --> rendered as [image]\n[image]

#4
[![]()]() --> rendered as [[image]]()
* we have not handle link yet
</example>

### C. Async Dimension Handling
- Create an `ImageDimensionStore` utility.
- Fetch image dimensions asynchronously.
- Trigger a partial tree re-render once dimensions are resolved to avoid layout "snapping".

## 5. Image Interactivity (Zoom/Pan Overlay)
- **Component**: Create `src/components/image-overlay.tsx`.
- **Features**:
    - Backdrop and high-res image view.
    - Zoom and pan capabilities (integration with D3-zoom or a lightweight library).
    - "Visit Link" button for images with external URLs.
    - ESC or backdrop click to close.

## 6. Distance Marker
- **File**: `src/platform/web/d3-renderer.ts`
- **Logic**: In `renderLinks()`:
    - Calculate `distance = sqrt((x2-x1)^2 + (y2-y1)^2)`.
    - Use `d3-path` to find the midpoint of the curved link.
    - Append a `<text>` element displaying the pixel distance (e.g., `124px`).

## 7. Platform Specifics (VS Code)
- **File**: `src/vscode/webview-provider.ts` (Check exact path)
- **Action**: Ensure all remote/local image URLs are wrapped in `webview.asWebviewUri()`.

---

## 📅 Timeline
- [ ] **Phase 1**: Configuration and Type updates.
- [ ] **Phase 2**: Markdown parser regex implementation.
- [ ] **Phase 3**: D3 renderer measurement and basic image drawing.
- [ ] **Phase 4**: Interactivity (Overlay) and Distance Markers.
- [ ] **Phase 5**: VS Code integration and testing.
