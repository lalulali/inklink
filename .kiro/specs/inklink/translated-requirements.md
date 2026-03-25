# Translated Requirements Document

> **Source:** `.kiro/specs/inklink/requirements copy 2.md`
> **Product:** Markdown to Mind Map Generator (InkLink)
> **Generated:** 2026-03-25

---

## Requirements

### Requirement 1: Parse Markdown Input

**User Story:** As a user, I want to input markdown text, so that it can be converted into a mind map structure.

#### Business Requirements

- Users need a reliable way to transform existing markdown documents into visual representations without manual reformatting.
- The parsing must be deterministic to ensure consistent and predictable mind map outputs.
- Clear error messaging on invalid input reduces user frustration and support overhead.

#### Technical Requirements

- Implement a `Parser` module that converts markdown text into an in-memory tree structure based on indentation levels.
- Support unlimited nesting depth by recursively processing indent levels.
- Detect relative indentation changes (greater, equal, lesser) to derive parent-child and sibling relationships.
- Validate indentation patterns and surface descriptive error messages on failure.
- Support both space-based and tab-based indentation, normalizing mixed types with a warning.
- Preserve special characters in node text without modification.

#### Acceptance Criteria

1. WHEN markdown text is provided, THE Parser SHALL convert it into a tree structure based on indentation.
2. THE Parser SHALL support unlimited nesting levels based on indent depth.
3. WHEN a line has greater indentation than the previous line, THE Parser SHALL create it as a child node.
4. WHEN a line has equal indentation to the previous line, THE Parser SHALL create it as a sibling node.
5. WHEN a line has less indentation than the previous line, THE Parser SHALL create it as a sibling to the appropriate ancestor node.
6. IF the markdown contains invalid indentation patterns, THEN THE Parser SHALL return a descriptive error message.

#### Implementation Guidance

- **Suggested Approach:** Recursive descent parser tracking indent stack; normalize tabs to spaces (4 spaces = 1 tab).
- **Complexity Estimate:** Medium
- **Risks:** Mixed indentation (spaces + tabs) can cause misalignments — normalization must be clearly documented.
- **Testing Strategy:** Unit tests for each nesting rule; fuzz tests with random indentation patterns.

---

### Requirement 2: Generate Balanced Two-Sided Layout

**User Story:** As a user, I want the mind map to be organized with branches on both sides of the root, so that the visualization is balanced and easy to read.

#### Business Requirements

- A balanced layout maximizes visual clarity and reduces cognitive load when reading complex mind maps.
- Centering the root node provides a natural focal point for users.
- Equalized node distribution across sides ensures neither side becomes overwhelmingly large.

#### Technical Requirements

- Implement a `Layout_Engine` that places the root node at the canvas center.
- Distribute first-level child branches between left and right sides using a greedy balancing algorithm based on subtree node count.
- Apply consistent vertical spacing between sibling nodes at the same level.
- Recalculate layout whenever the tree structure changes (add/remove node, expand/collapse).
- Implement collision detection to prevent node overlap.

#### Acceptance Criteria

1. THE Layout_Engine SHALL place the root node at the center of the canvas.
2. THE Layout_Engine SHALL distribute child branches between left and right sides of the root node.
3. THE Layout_Engine SHALL balance the number of nodes on each side to minimize height differences.
4. WHEN the tree structure changes, THE Layout_Engine SHALL recalculate the balanced layout.
5. THE Layout_Engine SHALL maintain consistent spacing between nodes at the same level.
6. THE Layout_Engine SHALL prevent node overlap in the generated layout.

#### Implementation Guidance

- **Suggested Approach:** Weighted subtree assignment to left/right, then Reingold–Tilford or Buchheim algorithm for spacing.
- **Complexity Estimate:** High
- **Risks:** Very unbalanced trees (one giant subtree) may still appear lopsided — document limitations.
- **Testing Strategy:** Visual regression tests; property-based tests asserting no node overlap.

---

### Requirement 3: Apply Colorful Styling

**User Story:** As a user, I want the mind map to use random colors, so that different branches are visually distinct and appealing.

#### Business Requirements

- Visually distinct branch colors help users quickly differentiate topics and sub-topics.
- Color consistency within a branch improves readability and aesthetic coherence.
- Using a curated palette prevents poor color combinations that hurt accessibility.

#### Technical Requirements

- Assign a random color from a predefined accessible palette to each first-level branch.
- Propagate the branch's assigned color to all descendant nodes.
- Ensure sufficient contrast ratio between node text and background (WCAG AA minimum, ≥ 4.5:1).
- Emit new random color assignments each time the mind map is regenerated.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL assign a random color to each branch from the root node.
2. THE Mind_Map_Generator SHALL ensure sufficient contrast between text and background colors for readability.
3. THE Mind_Map_Generator SHALL apply consistent colors to all nodes within the same branch.
4. THE Mind_Map_Generator SHALL use a predefined color palette to ensure visual harmony.
5. WHEN a mind map is regenerated, THE Mind_Map_Generator SHALL assign different random colors.

#### Implementation Guidance

- **Suggested Approach:** HSL-based curated palette (e.g., 12 hues at fixed saturation/lightness); contrast check via WCAG formula.
- **Complexity Estimate:** Low
- **Risks:** Same color may be assigned to adjacent branches if palette is small — shuffle without replacement.
- **Testing Strategy:** Automated contrast ratio assertions; visual snapshot tests.

---

### Requirement 4: Export to Multiple Formats

**User Story:** As a user, I want to export the mind map to various formats, so that I can use it in different contexts and applications.

#### Business Requirements

- Users need to share mind maps in presentations, documents, and web pages, requiring multiple output formats.
- High-resolution raster exports prevent quality degradation when embedded in reports.
- Transparent PNG support allows embedding into custom backgrounds without a white box.

#### Technical Requirements

- Implement an `Exporter` module supporting: **HTML** (with embedded CSS and JS interactivity), **SVG** (scalable vector), **PNG** (raster, configurable background).
- PNG exports must support both transparent and white background options.
- Raster exports must produce output at a minimum of 1920×1080 pixels.
- Preserve all visual styling (colors, fonts, connectors) in each format.
- Return descriptive error messages on export failure.

#### Acceptance Criteria

1. THE Exporter SHALL export mind maps to HTML format with embedded styles and interactivity.
2. THE Exporter SHALL export mind maps to SVG format as scalable vector graphics.
3. THE Exporter SHALL export mind maps to PNG format as raster images with configurable background (transparent or white).
4. WHEN exporting to PNG format, THE Exporter SHALL provide an option to select transparent background.
5. WHEN exporting to PNG format, THE Exporter SHALL provide an option to select white background.
6. WHEN exporting to raster formats, THE Exporter SHALL maintain a minimum resolution of 1920×1080 pixels.
7. THE Exporter SHALL preserve all visual styling in exported formats.
8. IF an export operation fails, THEN THE Exporter SHALL return a descriptive error message.

#### Implementation Guidance

- **Suggested Approach:** SVG as intermediate representation; HTML wraps SVG with event listeners; PNG renders SVG to `<canvas>` via `Canvg` or native browser API.
- **Complexity Estimate:** High
- **Risks:** Cross-origin font/image assets may break renders — inline all assets at export time.
- **Testing Strategy:** File format validation (file magic bytes); pixel comparison for PNG; W3C validation for HTML/SVG.

---

### Requirement 5: Handle Edge Cases and Validation

**User Story:** As a user, I want the system to handle invalid input gracefully, so that I receive clear feedback when something goes wrong.

#### Business Requirements

- Graceful error handling prevents data loss and maintains user trust.
- Descriptive messages reduce support requests by helping users self-diagnose issues.
- Input limits protect system performance and stability.

#### Technical Requirements

- Return a user-friendly error for empty or whitespace-only input.
- Preserve special characters verbatim in node text.
- Normalize mixed indentation (spaces + tabs) with a user-visible warning.
- Enforce a hard limit of 10,000 lines of markdown input.

#### Acceptance Criteria

1. WHEN empty markdown is provided, THE Mind_Map_Generator SHALL return an error indicating no content to process.
2. WHEN markdown contains only whitespace, THE Mind_Map_Generator SHALL return an error indicating no valid content.
3. WHEN markdown contains special characters, THE Parser SHALL preserve them in node text.
4. THE Parser SHALL support both space-based and tab-based indentation.
5. IF mixed indentation types are detected, THEN THE Parser SHALL return a warning and attempt to normalize indentation.
6. THE Mind_Map_Generator SHALL support markdown text up to 10,000 lines.

#### Implementation Guidance

- **Suggested Approach:** Pre-validation step before parsing; whitelist-based character-safe rendering.
- **Complexity Estimate:** Low
- **Risks:** Unicode edge cases (RTL, zero-width chars) — test with diverse character sets.
- **Testing Strategy:** Boundary tests at 0, 1, 9999, 10000, 10001 lines; character encoding tests.

---

### Requirement 6: Round-Trip Serialization

**User Story:** As a developer, I want to ensure data integrity through the parsing and generation pipeline, so that the system is reliable and testable.

#### Business Requirements

- Round-trip fidelity allows developers to trust the system as a reliable data transformation layer.
- JSON serialization enables integration with external tools, testing frameworks, and future APIs.
- Markdown round-trip ensures saved files remain human-readable and diff-friendly.

#### Technical Requirements

- Expose `serialize(tree) → JSON` and `deserialize(JSON) → tree` methods on the `Mind_Map_Generator`.
- Expose a `treeToMarkdown(tree) → string` method on the `Parser`.
- Guarantee that `deserialize(serialize(tree))` produces a structurally equivalent tree.
- Guarantee that `parse(treeToMarkdown(parse(md)))` preserves logical structure and content.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL provide a method to serialize the internal tree structure to JSON format.
2. THE Mind_Map_Generator SHALL provide a method to deserialize JSON back into the internal tree structure.
3. FOR ALL valid tree structures, serializing then deserializing SHALL produce an equivalent structure.
4. THE Parser SHALL provide a method to convert the tree structure back to markdown format.
5. FOR ALL valid markdown input, parsing then converting back to markdown SHALL preserve the logical structure and content.

#### Implementation Guidance

- **Suggested Approach:** JSON schema with `id`, `text`, `children`, `color`, `collapsed` fields; markdown emission with tracked indent width.
- **Complexity Estimate:** Medium
- **Risks:** Whitespace normalization during markdown-to-tree may cause non-identical (but equivalent) round-trips.
- **Testing Strategy:** Property-based tests using randomly generated trees; diff logical structure not raw strings.

---

### Requirement 7: Pan, Zoom, and Bird's Eye View

**User Story:** As a user, I want to pan, zoom, and see an overview of large mind maps, so that I can navigate complex structures efficiently.

#### Business Requirements

- Pan and zoom are essential for navigating mind maps larger than the viewport, especially on smaller screens.
- A minimap gives users spatial awareness of large, complex structures.
- Viewport constraints prevent users from getting "lost" in the canvas.

#### Technical Requirements

- Implement canvas panning via mouse drag and touch drag.
- Implement zoom via mouse wheel, pinch gesture, and UI controls; constrain between 10%–400%.
- Preserve viewport center point during zoom operations.
- Provide visual feedback (e.g., subtle bounce or border glow) when panning beyond map boundaries.
- Implement "Zoom to Fit" that scales and centers the full mind map within the viewport.
- Render a minimap widget with a viewport indicator; support click-to-navigate; allow show/hide toggle.
- Ensure minimap is particularly useful for maps with 100+ nodes.
- Animate all pan/zoom transitions smoothly (≥ 60 fps).

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL support panning by dragging the canvas with mouse or touch input.
2. THE Mind_Map_Generator SHALL support zoom in functionality through mouse wheel, pinch gesture, or zoom controls.
3. THE Mind_Map_Generator SHALL support zoom out functionality through mouse wheel, pinch gesture, or zoom controls.
4. THE Mind_Map_Generator SHALL maintain smooth animation during pan and zoom operations.
5. THE Mind_Map_Generator SHALL preserve the center point of the viewport when zooming.
6. THE Mind_Map_Generator SHALL constrain zoom levels between 10% and 400% of original size.
7. WHEN the user pans beyond the mind map boundaries, THE Mind_Map_Generator SHALL provide visual feedback indicating the edge.
8. THE Mind_Map_Generator SHALL support "zoom to fit" functionality that scales and centers the entire mind map within the viewport.
9. THE Mind_Map_Generator SHALL provide a minimap showing the full mind map structure.
10. THE minimap SHALL display a viewport indicator showing the currently visible area.
11. WHEN the user clicks on the minimap, THE Mind_Map_Generator SHALL navigate to that location.
12. THE Mind_Map_Generator SHALL provide a toggle to show/hide the minimap.
13. THE minimap SHALL be especially visible and useful for mind maps with more than 100 nodes.

#### Implementation Guidance

- **Suggested Approach:** CSS `transform: translate() scale()` on a canvas container; minimap as scaled-down SVG clone.
- **Complexity Estimate:** High
- **Risks:** Touch event handling across devices is inconsistent — test on iOS Safari and Android Chrome specifically.
- **Testing Strategy:** Automated interaction tests for pan/zoom limits; minimap click-to-navigate accuracy tests.

---

### Requirement 8: Save and Load from Markdown Files

**User Story:** As a user, I want to save and load mind maps from markdown files, so that I can persist my work and reuse existing markdown documents.

#### Business Requirements

- File persistence ensures users don't lose work between sessions.
- Markdown as the save format keeps files human-readable and compatible with other tools (e.g., VS Code, Obsidian).
- Drag-and-drop support reduces friction for users who manage files visually.

#### Technical Requirements

- Implement file open (via OS file picker) and save (write markdown to file) operations.
- Implement "Save As" to create named copies.
- Implement auto-save every 30 seconds, persisting markdown to the current file path.
- Maintain a persisted recent files list (last 10 entries) with file names and paths.
- Display the current file path in the UI header/status bar.
- Support drag-and-drop of `.md` files onto the application window.
- Validate file paths before all file operations; surface clear errors on failure.
- Prompt for unsaved changes before opening a new file or closing.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL provide functionality to load markdown files from the filesystem.
2. THE Mind_Map_Generator SHALL provide functionality to save the current mind map state back to a markdown file.
3. WHEN saving, THE Mind_Map_Generator SHALL preserve the exact markdown structure and content.
4. THE Mind_Map_Generator SHALL provide an auto-save option that saves every 30 seconds.
5. THE Mind_Map_Generator SHALL maintain a recent files list showing the last 10 opened files.
6. THE Mind_Map_Generator SHALL display the current file path in the interface.
7. THE Mind_Map_Generator SHALL provide a "Save As" function to create copies of the current mind map.
8. THE Mind_Map_Generator SHALL support drag-and-drop of markdown files to open them.
9. THE Mind_Map_Generator SHALL validate file paths before attempting to save or load.
10. WHEN a file fails to load, THE Mind_Map_Generator SHALL provide a clear error message with recovery options.

#### Implementation Guidance

- **Suggested Approach:** File System Access API (browser); recent files list in `localStorage`; drag-and-drop via `dragover`/`drop` events.
- **Complexity Estimate:** Medium
- **Risks:** File System Access API is not universally supported — provide fallback `<input type="file">`.
- **Testing Strategy:** Integration tests for file read/write; round-trip test (save → reload → compare).

---

### Requirement 9: Multiple Layout Directions

**User Story:** As a user, I want to choose from multiple layout directions, so that I can visualize my mind map in the way that best suits my content.

#### Business Requirements

- Different use cases (timelines, org charts, brainstorming) benefit from different orientations.
- Dynamic switching lets users explore layouts without re-creating the mind map.
- Persisting layout choice ensures users return to their preferred orientation.

#### Technical Requirements

- Implement five layout modes in the `Layout_Engine`: two-sided, left-to-right, right-to-left, top-to-bottom, bottom-to-top.
- Provide a UI selector to switch between layouts.
- Animate node position transitions when the layout changes.
- Persist the selected layout direction in the save file.
- Restore the persisted layout direction on load.
- Maintain node spacing and overlap prevention across all layout directions.

#### Acceptance Criteria

1. THE Layout_Engine SHALL support two-sided layout (balanced left and right).
2. THE Layout_Engine SHALL support left-to-right layout (all branches extend rightward).
3. THE Layout_Engine SHALL support right-to-left layout (all branches extend leftward).
4. THE Layout_Engine SHALL support top-to-bottom layout (all branches extend downward).
5. THE Layout_Engine SHALL support bottom-to-top layout (all branches extend upward).
6. THE Mind_Map_Generator SHALL allow users to switch between layout directions dynamically.
7. WHEN the layout direction changes, THE Layout_Engine SHALL recalculate node positions smoothly.
8. THE Mind_Map_Generator SHALL persist the selected layout direction when saving the mind map.
9. WHEN loading a saved mind map, THE Mind_Map_Generator SHALL restore the previously selected layout direction.
10. THE Layout_Engine SHALL maintain consistent spacing and prevent node overlap in all layout directions.

#### Implementation Guidance

- **Suggested Approach:** Parameterize Layout_Engine with a direction enum; swap X/Y coordinate axes for rotated layouts.
- **Complexity Estimate:** Medium
- **Risks:** Top-to-bottom/bottom-to-top may require different spacing constants — test separately.
- **Testing Strategy:** Snapshot tests for each layout; property-based overlap tests for all directions.

---

### Requirement 10: Expand, Collapse, and Reset Controls

**User Story:** As a user, I want to expand, collapse, and reset the mind map view, so that I can focus on relevant information and quickly return to a default state.

#### Business Requirements

- Collapse/expand controls allow users to progressively disclose detail, reducing cognitive overload on large maps.
- Independent sibling state gives users fine-grained control over their focus area.
- Reset functions provide a reliable "escape hatch" when the user gets disoriented.

#### Technical Requirements

- Implement "Expand All" and "Collapse All" global controls with smooth animations.
- Implement per-node toggle (click to expand/collapse child nodes) with visual indicator (e.g., `+`/`-` badge).
- Maintain collapsed/expanded state independently per branch (sibling state is not affected).
- Implement "Reset Zoom" (to 100%), "Reset Pan" (center on root), and "Reset All" (zoom + pan + expand all).
- Provide keyboard shortcuts for all reset operations.
- "Collapse All" shows root and immediate children only.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL provide a control to expand all collapsed branches simultaneously.
2. THE Mind_Map_Generator SHALL provide a control to collapse all expanded branches simultaneously.
3. WHEN all branches are expanded, THE Mind_Map_Generator SHALL display all nodes in the tree structure.
4. WHEN all branches are collapsed, THE Mind_Map_Generator SHALL display only the root node and its immediate children.
5. THE Mind_Map_Generator SHALL animate the expand/collapse all operation smoothly.
6. WHEN a node with children is clicked, THE Mind_Map_Generator SHALL toggle the visibility of its child nodes.
7. THE Mind_Map_Generator SHALL display a visual indicator on nodes that have collapsible children.
8. THE Mind_Map_Generator SHALL maintain the collapsed/expanded state of sibling branches independently.
9. THE Mind_Map_Generator SHALL provide a reset zoom function that returns zoom to 100%.
10. THE Mind_Map_Generator SHALL provide a reset pan function that centers the view on the root node.
11. THE Mind_Map_Generator SHALL provide a reset collapsed/expanded states function that expands all branches.
12. THE Mind_Map_Generator SHALL provide a "Reset All" button that performs all reset operations simultaneously.
13. THE Mind_Map_Generator SHALL provide keyboard shortcuts for all reset operations.

#### Implementation Guidance

- **Suggested Approach:** Store `collapsed: boolean` per node in state; CSS `transition` for smooth show/hide; compose Reset All from atomic resets.
- **Complexity Estimate:** Medium
- **Risks:** Animating large batches (1000 nodes) during Expand All may drop below 60 fps — consider virtualized animation.
- **Testing Strategy:** Unit tests for state transitions; visual regression tests for indicator badges.

---

### Requirement 11: Keyboard Shortcuts

**User Story:** As a power user, I want comprehensive keyboard shortcuts, so that I can work efficiently without constantly reaching for the mouse.

#### Business Requirements

- Keyboard-first workflows significantly increase productivity for frequent users.
- Customizable shortcuts improve adoption by users with non-standard keyboard layouts or accessibility needs.
- A discoverable shortcut reference lowers the learning curve.

#### Technical Requirements

- Implement platform-aware modifier detection (`Ctrl` on Windows/Linux, `Cmd` on macOS).
- Register the following default shortcuts: `Ctrl/Cmd+S` (save), `Ctrl/Cmd+O` (open), `Ctrl/Cmd+E` (export), `Ctrl/Cmd+Z` (undo), `Ctrl/Cmd+Shift+Z` (redo), `Space+drag` (pan), `Ctrl/Cmd+scroll` (zoom), `F` (zoom-to-fit), `R` (reset view), `E` (expand all), `C` (collapse all), `1-5` (layout direction), `Escape` (deselect), `Ctrl/Cmd+F` (search), `?` (help).
- Provide a shortcut configuration UI allowing users to remap keys.
- Render a keyboard shortcut reference overlay accessible via `?`.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL support Ctrl/Cmd+S to save the current file.
2. THE Mind_Map_Generator SHALL support Ctrl/Cmd+O to open a file.
3. THE Mind_Map_Generator SHALL support Ctrl/Cmd+E to export the mind map.
4. THE Mind_Map_Generator SHALL support Ctrl/Cmd+Z to undo the last action.
5. THE Mind_Map_Generator SHALL support Ctrl/Cmd+Shift+Z to redo the last undone action.
6. THE Mind_Map_Generator SHALL support Space+drag to pan the canvas.
7. THE Mind_Map_Generator SHALL support Ctrl/Cmd+scroll to zoom in and out.
8. THE Mind_Map_Generator SHALL support F key to fit the mind map to screen.
9. THE Mind_Map_Generator SHALL support R key to reset the view.
10. THE Mind_Map_Generator SHALL support E key to expand all branches.
11. THE Mind_Map_Generator SHALL support C key to collapse all branches.
12. THE Mind_Map_Generator SHALL support number keys 1-5 to switch between layout directions.
13. THE Mind_Map_Generator SHALL support Escape key to deselect nodes.
14. THE Mind_Map_Generator SHALL support Ctrl/Cmd+F to open the search function.
15. THE Mind_Map_Generator SHALL support ? key to display a keyboard shortcut reference.
16. THE Mind_Map_Generator SHALL allow users to configure custom keyboard shortcuts.
17. THE keyboard shortcut reference SHALL display all available shortcuts in a clear, organized manner.

#### Implementation Guidance

- **Suggested Approach:** Centralized shortcut registry (map of `KeyCombo → Action`); user config persisted in `localStorage`; modal overlay for `?` reference.
- **Complexity Estimate:** Medium
- **Risks:** Conflicts with browser-native shortcuts (e.g., `Ctrl+S`) — use `preventDefault` carefully and document known conflicts.
- **Testing Strategy:** Automated keyboard event simulation for all registered shortcuts; conflict detection tests.

---

### Requirement 12: Undo and Redo

**User Story:** As a user, I want to undo and redo my actions, so that I can experiment freely and recover from mistakes.

#### Business Requirements

- Undo/redo is the primary safety net for users making exploratory changes.
- Maintaining a deep history (50+ operations) reduces the risk of unrecoverable states.
- Visual indication of undo/redo availability prevents user confusion ("why isn't anything undoing?").

#### Technical Requirements

- Implement an `Undo_Stack` supporting all state-changing operations: collapse/expand, layout direction changes, zoom/pan, and text edits.
- Stack depth: minimum 50 operations.
- Implement redo to re-apply undone operations.
- Provide visual indicators (e.g., greyed-out toolbar icons) for undo/redo availability.
- Clear the undo stack on new file load; preserve it on save.
- Undo/redo must execute in < 16ms (imperceptible delay).

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL support undo for all state-changing operations.
2. THE Mind_Map_Generator SHALL support undo for collapse/expand operations.
3. THE Mind_Map_Generator SHALL support undo for layout direction changes.
4. THE Mind_Map_Generator SHALL support undo for zoom and pan operations.
5. THE Mind_Map_Generator SHALL support undo for text editing operations if text editing is implemented.
6. THE Mind_Map_Generator SHALL maintain an undo stack of at least 50 operations.
7. THE Mind_Map_Generator SHALL support redo to reapply undone operations.
8. THE Mind_Map_Generator SHALL provide visual indication when undo is available.
9. THE Mind_Map_Generator SHALL provide visual indication when redo is available.
10. THE Mind_Map_Generator SHALL clear the undo stack when a new file is loaded.
11. THE Mind_Map_Generator SHALL preserve the undo stack when saving the current file.
12. THE undo/redo operations SHALL execute instantly without noticeable delay.

#### Implementation Guidance

- **Suggested Approach:** Command pattern — each action encapsulates `execute()` and `undo()`; stacks stored as arrays capped at 50.
- **Complexity Estimate:** Medium
- **Risks:** Undo during ongoing animations may corrupt state — flush animations before applying undo.
- **Testing Strategy:** State machine tests verifying correct state after undo/redo sequences; stress test at 50-operation boundary.

---

### Requirement 13: Search and Find

**User Story:** As a user, I want to search for text within the mind map, so that I can quickly locate specific nodes in large structures.

#### Business Requirements

- Fast, in-map search eliminates the need for users to manually scan large mind maps.
- Real-time results and result count give immediate feedback on search scope.
- Auto-pan to result removes the need for manual navigation after finding a match.

#### Technical Requirements

- Implement a search panel triggered by `Ctrl/Cmd+F`.
- Search within node text content; support both case-sensitive and case-insensitive modes (default: case-insensitive).
- Highlight all matching nodes with a distinct visual style.
- Provide next/previous result navigation.
- Auto-pan and auto-zoom to center on the current result.
- Display result count in format "N of M".
- Update results in real-time as the user types.
- Show "No results found" when there are no matches.
- Provide a clear/dismiss function to remove highlights.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL provide a search function accessible via Ctrl/Cmd+F.
2. THE search function SHALL find text within node content.
3. THE Mind_Map_Generator SHALL highlight all nodes that match the search query.
4. THE Mind_Map_Generator SHALL provide next/previous navigation between search results.
5. THE Mind_Map_Generator SHALL automatically pan and zoom to center on the current search result.
6. THE Mind_Map_Generator SHALL provide a clear search highlights function.
7. THE search function SHALL support case-sensitive search option.
8. THE search function SHALL support case-insensitive search option (default).
9. THE Mind_Map_Generator SHALL display the count of search results (e.g., "3 of 15").
10. THE search function SHALL update results in real-time as the user types.
11. WHEN no results are found, THE Mind_Map_Generator SHALL display a "No results found" message.
12. THE search highlights SHALL be visually distinct from normal node styling.

#### Implementation Guidance

- **Suggested Approach:** Debounced input handler (150ms); filter tree nodes by text match; index results as ordered array for prev/next.
- **Complexity Estimate:** Medium
- **Risks:** Real-time search on 10,000-node maps may cause jank — enforce 500ms SLA and use web worker if needed.
- **Testing Strategy:** Unit tests for match/no-match scenarios; performance tests at 1000-node scale; snapshot tests for highlight styling.

---

### Requirement 14: Auto-Save and Recovery

**User Story:** As a user, I want automatic saving and crash recovery, so that I never lose my work due to unexpected issues.

#### Business Requirements

- Auto-save reduces the risk of data loss from crashes, power failures, or accidental tab closure.
- Crash recovery restores user context immediately after an incident, minimizing disruption.
- Configurable intervals respect users with low-storage environments or performance concerns.

#### Technical Requirements

- Auto-save current state every 30 seconds by default; make interval configurable.
- Provide a toggle to disable auto-save.
- Save auto-save data to a temporary location separate from the primary file.
- Display a visual save status indicator (saved / unsaved / saving).
- On startup, detect orphaned recovery data and offer restoration.
- Clear recovery data on manual save; delete on user decline.
- Auto-save must not block the UI thread (use async/background write).

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL auto-save the current state every 30 seconds by default.
2. THE Mind_Map_Generator SHALL provide an option to configure the auto-save interval.
3. THE Mind_Map_Generator SHALL provide an option to disable auto-save.
4. THE Mind_Map_Generator SHALL display a visual indicator showing save status (saved/unsaved/saving).
5. WHEN the application crashes or closes unexpectedly, THE Mind_Map_Generator SHALL preserve the last auto-saved state.
6. WHEN reopening after a crash, THE Mind_Map_Generator SHALL offer to recover from the last auto-save.
7. THE Mind_Map_Generator SHALL clear recovery data after a successful manual save.
8. THE auto-save operation SHALL not interrupt user interactions or cause noticeable lag.
9. THE Mind_Map_Generator SHALL save auto-save data to a temporary location separate from the original file.
10. WHEN the user declines recovery, THE Mind_Map_Generator SHALL delete the recovery data.

#### Implementation Guidance

- **Suggested Approach:** `setInterval`-based auto-save writing to `localStorage` or IndexedDB; startup check for recovery key before rendering.
- **Complexity Estimate:** Medium
- **Risks:** IndexedDB write failures on storage-full devices — handle quota errors gracefully with user notification.
- **Testing Strategy:** Simulate crash (force close) and verify recovery on reopen; timer-based integration tests for interval accuracy.

---

### Requirement 15: File Management

**User Story:** As a user, I want convenient file management features, so that I can easily access and organize my mind maps.

#### Business Requirements

- A recent files list accelerates access to frequently used mind maps.
- Unsaved changes indicators prevent accidental data loss.
- Drag-and-drop file opening reduces friction for file-manager power users.

#### Technical Requirements

- Persist and display the last 10 opened files (name + path) in a recent files menu.
- Enable single-click opening from the recent files list.
- Display the current file path prominently (status bar or title bar).
- Show an unsaved changes indicator (e.g., dot on title or `*` in path) when modified.
- Implement "Save As" to write current state to a new file path.
- Support drag-and-drop of `.md` files onto the window.
- Validate file paths before operations; display clear error on invalid paths.
- Prompt to save unsaved changes on new-file or close actions.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL maintain a recent files list showing the last 10 opened files.
2. THE recent files list SHALL display file names and paths.
3. THE Mind_Map_Generator SHALL allow users to open files from the recent files list with a single click.
4. THE Mind_Map_Generator SHALL display the current file path prominently in the interface.
5. THE Mind_Map_Generator SHALL display an unsaved changes indicator when the file has been modified.
6. THE Mind_Map_Generator SHALL provide a "Save As" function to create a copy with a new name.
7. THE Mind_Map_Generator SHALL support drag-and-drop of markdown files onto the application window to open them.
8. THE Mind_Map_Generator SHALL validate file paths before attempting file operations.
9. WHEN a file path is invalid, THE Mind_Map_Generator SHALL display a clear error message.
10. THE Mind_Map_Generator SHALL prompt the user to save unsaved changes before opening a new file or closing.

#### Implementation Guidance

- **Suggested Approach:** Recent files in `localStorage` (JSON array, max 10, FIFO); `beforeunload` event for unsaved changes prompt.
- **Complexity Estimate:** Low
- **Risks:** `beforeunload` is suppressed in some browser environments — document browser-specific behavior.
- **Testing Strategy:** State-based tests for recent list updates; integration tests for "dirty" indicator on modification.

---

### Requirement 16: Performance Requirements

**User Story:** As a user, I want the mind map to remain responsive even with large documents, so that I can work efficiently with complex structures.

#### Business Requirements

- 60 fps rendering is the baseline for a "smooth" feeling application on modern hardware.
- Lazy rendering prevents memory and CPU exhaustion when maps are very large.
- Predictable performance SLAs allow confident use of the tool for large projects.

#### Technical Requirements

- Maintain 60 fps rendering for ≤ 1000 nodes; implement viewport-based lazy rendering.
- Support smooth pan and zoom at ≤ 1000 nodes without stuttering.
- Complete export operations within 30 seconds; show progress indicator otherwise.
- Parse and display files ≤ 5000 lines within 2 seconds.
- Show a loading indicator for operations taking > 500 ms.
- Complete layout recalculation within 1 second for ≤ 500 nodes.
- Return search results within 500 ms for ≤ 1000 nodes.
- Optimize memory usage to prevent browser OOM crashes on large maps.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL maintain 60 frames per second (fps) rendering for mind maps with up to 1000 nodes.
2. THE Mind_Map_Generator SHALL implement lazy rendering to only render nodes visible in the current viewport.
3. THE Mind_Map_Generator SHALL maintain smooth pan operations (no stuttering or lag) for mind maps with up to 1000 nodes.
4. THE Mind_Map_Generator SHALL maintain smooth zoom operations (no stuttering or lag) for mind maps with up to 1000 nodes.
5. THE Mind_Map_Generator SHALL complete export operations within 30 seconds or display a progress indicator.
6. THE Mind_Map_Generator SHALL load and parse markdown files up to 5000 lines in under 2 seconds.
7. THE Mind_Map_Generator SHALL display a loading indicator for operations taking longer than 500 milliseconds.
8. THE layout recalculation SHALL complete within 1 second for mind maps with up to 500 nodes.
9. THE search function SHALL return results within 500 milliseconds for mind maps with up to 1000 nodes.
10. THE Mind_Map_Generator SHALL optimize memory usage to prevent browser crashes with large mind maps.

#### Implementation Guidance

- **Suggested Approach:** `requestAnimationFrame` for rendering loop; viewport culling with bounding box intersection; web workers for parsing and search.
- **Complexity Estimate:** High
- **Risks:** Browser rendering performance varies widely between devices — define minimum tested hardware spec.
- **Testing Strategy:** Performance benchmarks (Lighthouse, custom frame-timing tests) for all SLA targets; memory profiling with 1000-node maps.

---

### Requirement 17: Error Recovery

**User Story:** As a user, I want clear error messages and recovery options, so that I can resolve issues quickly and continue working.

#### Business Requirements

- Plain-language errors empower non-technical users to self-resolve issues.
- Graceful degradation maintains partial functionality during errors, reducing total disruption.
- Retry with backoff handles transient failures (e.g., file system locks) without user intervention.

#### Technical Requirements

- Display plain-language error messages for all error conditions (no stack traces to the user).
- Offer actionable recovery suggestions for corrupted files and failed operations.
- Implement retry with exponential backoff for retryable operations (e.g., file I/O).
- Log detailed errors (including stack traces) to an internal debug log, not the UI.
- Provide a "Report Issue" option for unexpected errors (could open a bug report form or copy log to clipboard).
- Validate all user input before processing to prevent downstream errors.
- On file operation failure, preserve in-memory state to prevent data loss.
- Degrade gracefully on unexpected errors (disable affected feature, keep rest of app functional).

#### Acceptance Criteria

1. WHEN a parsing error occurs, THE Mind_Map_Generator SHALL display a clear error message indicating the problem.
2. WHEN a file is corrupted, THE Mind_Map_Generator SHALL offer recovery suggestions.
3. THE Mind_Map_Generator SHALL provide actionable recovery options for all error conditions.
4. WHEN an operation fails, THE Mind_Map_Generator SHALL implement a retry mechanism with exponential backoff.
5. THE Mind_Map_Generator SHALL log errors for debugging purposes without exposing technical details to users.
6. WHEN an unexpected error occurs, THE Mind_Map_Generator SHALL gracefully degrade functionality rather than crashing.
7. THE error messages SHALL be written in plain language without technical jargon.
8. THE Mind_Map_Generator SHALL provide a "Report Issue" option for unexpected errors.
9. WHEN a file operation fails, THE Mind_Map_Generator SHALL preserve the current state to prevent data loss.
10. THE Mind_Map_Generator SHALL validate user input before processing to prevent errors.

#### Implementation Guidance

- **Suggested Approach:** Global error boundary (try/catch + `window.onerror`); tiered error classification (user error, transient, fatal); structured internal log.
- **Complexity Estimate:** Medium
- **Risks:** Overly aggressive error swallowing can mask bugs in development — use error boundary only in production builds.
- **Testing Strategy:** Inject errors at each failure point; verify user-facing message quality; verify internal log completeness.

---

### Requirement 18: Export Reliability

**User Story:** As a user, I want reliable exports with clear feedback, so that I can confidently save my mind maps in various formats.

#### Business Requirements

- Export reliability is critical for workflows where the mind map is the final deliverable.
- Progress indicators and cancel support improve UX for large exports that may take many seconds.
- Persisting last-used settings reduces repetitive configuration.

#### Technical Requirements

- Display a progress indicator (with percentage) for exports taking > 1 second.
- Provide a cancel button for in-progress exports.
- Implement retry with exponential backoff for failed exports.
- Validate exported file integrity before offering download.
- Provide an export preview (thumbnail or quick render) before download confirmation.
- Persist last-used export settings (format, background) in `localStorage`.
- Run export operations asynchronously to avoid blocking UI interactions.
- Display a success notification on export completion.

#### Acceptance Criteria

1. WHEN an export operation takes longer than 1 second, THE Mind_Map_Generator SHALL display a progress indicator.
2. THE progress indicator SHALL show the percentage of completion for the export operation.
3. THE Mind_Map_Generator SHALL provide a cancel button for long-running export operations.
4. WHEN an export fails, THE Mind_Map_Generator SHALL implement a retry mechanism with exponential backoff.
5. THE Mind_Map_Generator SHALL validate the exported file before offering it for download.
6. THE Mind_Map_Generator SHALL provide an export preview option to verify the output before downloading.
7. THE Mind_Map_Generator SHALL remember the last used export settings (format, background color).
8. WHEN the user exports again, THE Mind_Map_Generator SHALL default to the previously used settings.
9. THE export operation SHALL not block user interactions with the mind map.
10. WHEN an export completes successfully, THE Mind_Map_Generator SHALL display a success notification.

#### Implementation Guidance

- **Suggested Approach:** Web Worker for heavy rendering; `Blob` + `URL.createObjectURL` for downloads; `localStorage` for settings persistence.
- **Complexity Estimate:** Medium
- **Risks:** File validation (especially for PNG) can be expensive — limit to basic checks (non-zero file size, valid header).
- **Testing Strategy:** Mock slow export to verify progress/cancel UX; file integrity assertions on output; settings persistence tests.

---

### Requirement 19: Visual Feedback

**User Story:** As a user, I want clear visual feedback for all operations, so that I always know what the system is doing.

#### Business Requirements

- Responsive feedback prevents users from double-clicking or re-triggering operations in uncertainty.
- Non-intrusive notifications (auto-dismiss) maintain workflow without forcing user acknowledgment.
- A status bar provides persistent, low-priority context (file name, save state, node count).

#### Technical Requirements

- Show a loading indicator for files > 1000 lines; show progress for measurable operations.
- Display a 2-second confirmation toast on save success.
- Display dismissible error notifications that do not auto-dismiss.
- Display auto-dismissing success notifications (3-second timeout).
- Render a status bar showing: current file name, save status, and node count.
- Notifications must be non-blocking (pointer events passthrough).
- Apply consistent visual styling to all feedback elements (same toast design system).

#### Acceptance Criteria

1. WHEN opening a file larger than 1000 lines, THE Mind_Map_Generator SHALL display a loading indicator.
2. THE loading indicator SHALL show progress for operations that can be measured.
3. WHEN a file is saved, THE Mind_Map_Generator SHALL display a visual confirmation for 2 seconds.
4. WHEN an error occurs, THE Mind_Map_Generator SHALL display an error notification with a dismiss option.
5. WHEN an operation completes successfully, THE Mind_Map_Generator SHALL display a success notification.
6. THE Mind_Map_Generator SHALL display operation status in a status bar at the bottom of the interface.
7. THE status bar SHALL show the current file name, save status, and node count.
8. THE notifications SHALL be non-intrusive and not block user interactions.
9. THE notifications SHALL automatically dismiss after 3 seconds unless they contain errors.
10. THE Mind_Map_Generator SHALL use consistent visual styling for all feedback elements.

#### Implementation Guidance

- **Suggested Approach:** Toast notification component (queue-based); status bar as a persistent bottom bar component; CSS `pointer-events: none` on toasts.
- **Complexity Estimate:** Low
- **Risks:** Notification queues can overflow on rapid successive operations — cap queue length or consolidate duplicate messages.
- **Testing Strategy:** Verify toast appearance/dismissal timing with fake timers; snapshot tests for status bar content.

---

### Requirement 20: Accessibility

**User Story:** As a user who prefers keyboard navigation, I want full keyboard access to all features, so that I can work efficiently without a mouse.

#### Business Requirements

- Accessibility compliance broadens the user base and may be a legal requirement in institutional contexts.
- Keyboard navigation parity ensures power users and users with motor disabilities have a full-featured experience.
- High contrast mode and screen reader support demonstrate inclusive design commitment.

#### Technical Requirements

- Implement Tab navigation between nodes; Arrow key navigation between connected nodes; Enter to expand/collapse selected node.
- Ensure all features are reachable via keyboard (no mouse-only interactions).
- Add ARIA labels and roles to all nodes and interactive elements for screen reader support.
- Implement a high contrast mode toggle (color palette switch).
- Ensure all interactive elements have visible `:focus` indicators.
- Support keyboard navigation within all menus and dialogs.
- Provide text alternatives for all visual-only information.
- Comply with WCAG 2.1 Level AA guidelines.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL support Tab key to navigate between nodes.
2. THE Mind_Map_Generator SHALL support Arrow keys to move between connected nodes.
3. THE Mind_Map_Generator SHALL support Enter key to expand/collapse the selected node.
4. THE Mind_Map_Generator SHALL ensure all features are accessible via keyboard shortcuts.
5. THE Mind_Map_Generator SHALL provide screen reader support for node content.
6. THE Mind_Map_Generator SHALL provide a high contrast mode option for better visibility.
7. THE Mind_Map_Generator SHALL ensure all interactive elements have visible focus indicators.
8. THE Mind_Map_Generator SHALL support keyboard navigation for all menus and dialogs.
9. THE Mind_Map_Generator SHALL provide text alternatives for all visual information.
10. THE Mind_Map_Generator SHALL follow WCAG 2.1 Level AA guidelines where applicable.

#### Implementation Guidance

- **Suggested Approach:** SVG nodes with `tabindex`, `role="button"`, and `aria-label`; high contrast via CSS custom properties toggle; avoid `outline: none` without alternative.
- **Complexity Estimate:** High
- **Risks:** Dynamic SVG content is poorly supported by screen readers — test with NVDA, VoiceOver, and JAWS.
- **Testing Strategy:** Axe/Pa11y automated accessibility scan; manual screen reader walkthrough; keyboard-only end-to-end test.

---

### Requirement 21: Platform Support

**User Story:** As a user, I want to know which platforms are supported, so that I can use the tool on my preferred system.

#### Business Requirements

- Clearly scoping platform support manages user expectations and focuses QA effort.
- Desktop-only targeting allows full use of file system APIs not available on mobile.
- Platform-specific keyboard shortcut detection reduces support requests from macOS users confused by Ctrl vs. Cmd.

#### Technical Requirements

- Target desktop platforms only (Windows, macOS, Linux) in the initial version.
- Support Chrome ≥ 90, Firefox ≥ 88, Safari ≥ 14, Edge ≥ 90.
- Display a warning banner when accessed from an unsupported browser.
- Explicitly exclude mobile and tablet support in v1.
- Detect OS/platform at runtime to apply correct keyboard modifier (`Ctrl` vs. `Cmd`).
- Provide platform-specific installation or setup instructions in documentation.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL be explicitly designed for desktop platforms only (Windows, macOS, Linux).
2. THE Mind_Map_Generator SHALL support Chrome version 90 and above.
3. THE Mind_Map_Generator SHALL support Firefox version 88 and above.
4. THE Mind_Map_Generator SHALL support Safari version 14 and above.
5. THE Mind_Map_Generator SHALL support Edge version 90 and above.
6. THE Mind_Map_Generator SHALL display a warning message when accessed from unsupported browsers.
7. THE Mind_Map_Generator SHALL not provide mobile or tablet support in the initial version.
8. THE documentation SHALL clearly state the supported platforms and browser versions.
9. THE Mind_Map_Generator SHALL detect the user's platform and optimize keyboard shortcuts accordingly (Ctrl for Windows/Linux, Cmd for macOS).
10. THE Mind_Map_Generator SHALL provide platform-specific installation instructions if applicable.

#### Implementation Guidance

- **Suggested Approach:** `navigator.userAgent` or `navigator.userAgentData` for browser detection; `navigator.platform` or `navigator.userAgentData.platform` for OS.
- **Complexity Estimate:** Low
- **Risks:** User-agent sniffing is unreliable — prefer feature detection where possible; UA sniffing only for modifier key defaulting.
- **Testing Strategy:** Cross-browser matrix tests (BrowserStack or Playwright multi-browser); manual verification on each supported browser version.

---

## Completeness Validation

| Check | Status |
|---|---|
| ✅ Happy path scenarios | Covered across all 21 requirements |
| ✅ Error conditions and edge cases | Req 5, 17 |
| ✅ Performance expectations | Req 16 |
| ✅ Security requirements | Implicit: input validation (Req 5, 17), data preservation on failure (Req 17) |
| ✅ Accessibility needs | Req 20 |
| ⚠️ Localization / i18n | Not addressed — recommend adding if multi-language support is planned |
| ✅ Data retention and privacy | Auto-save/recovery data lifecycle (Req 14) |
| ✅ Integration points | File System Access API, export libraries (Req 4, 8) |
| ✅ Platform compatibility | Req 21 |

> [!WARNING]
> **Localization Gap**: No requirements address multi-language UI or RTL language support. If InkLink targets non-English markets, add a Requirement 22 for i18n.
