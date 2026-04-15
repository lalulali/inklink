import * as fc from 'fast-check';
import { TreeNode, NodeMetadata } from '../types/tree-node';
import { ApplicationState } from '../types/application-state';
import { Transform, LayoutDirection } from '../types/interfaces';

/**
 * Generator for NodeMetadata
 */
export const nodeMetadataArb = fc.record({
  x: fc.float(),
  y: fc.float(),
  width: fc.float({ min: 0 }),
  height: fc.float({ min: 0 }),
  visible: fc.boolean(),
  highlighted: fc.boolean(),
});

/**
 * Generator for TreeNode (recursive with depth limit)
 */
export const treeNodeArb: fc.Arbitrary<TreeNode> = fc.letrec((tie) => ({
  node: fc.oneof(
    {
      weight: 1,
      arbitrary: fc.record({
        id: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        content: fc
          .string({ minLength: 1 })
          .filter((s) => s.trim().length > 0 && s[0] !== ' ' && s[0] !== '\t'),
        depth: fc.integer({ min: 0, max: 5 }),
        children: fc.array(tie('node') as fc.Arbitrary<TreeNode>, { maxLength: 2 }),
        parent: fc.constant(null),
        collapsed: fc.boolean(),
        color: fc.string(),
        metadata: nodeMetadataArb,
      }),
    },
    {
      weight: 3, // Favor leaves to terminate recursion
      arbitrary: fc.record({
        id: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        content: fc
          .string({ minLength: 1 })
          .filter((s) => s.trim().length > 0 && s[0] !== ' ' && s[0] !== '\t'),
        depth: fc.integer({ min: 0, max: 5 }),
        children: fc.constant([]),
        parent: fc.constant(null),
        collapsed: fc.boolean(),
        color: fc.string(),
        metadata: nodeMetadataArb,
      }),
    }
  ),
})).node;

/**
 * Generator for Transform
 */
export const transformArb: fc.Arbitrary<Transform> = fc.record({
  x: fc.float(),
  y: fc.float(),
  scale: fc.float({ min: Math.fround(0.1), max: Math.fround(10) }),
});

/**
 * Generator for LayoutDirection
 */
export const layoutDirectionArb: fc.Arbitrary<LayoutDirection> = fc.constantFrom(
  'two-sided',
  'left-to-right',
  'right-to-left'
);

/**
 * Generator for ApplicationState
 */
export const applicationStateArb: fc.Arbitrary<ApplicationState> = fc.record({
  tree: fc.option(treeNodeArb, { nil: null }),
  markdown: fc.string(),
  currentFile: fc.option(
    fc.record({
      path: fc.string(),
      name: fc.string(),
    }),
    { nil: null }
  ),
  filePath: fc.option(fc.string(), { nil: null }),
  isDirty: fc.boolean(),
  lastSaved: fc.option(fc.date(), { nil: null }),
  layoutDirection: layoutDirectionArb,
  layoutPositions: fc.constant(new Map()),
  transform: transformArb,
  minimapVisible: fc.boolean(),
  selectedNode: fc.option(fc.string(), { nil: null }),
  searchQuery: fc.string(),
  searchResults: fc.array(fc.string()),
  currentSearchIndex: fc.integer({ min: -1 }),
  loading: fc.boolean(),
  error: fc.option(fc.string(), { nil: null }),
  notification: fc.option(
    fc.record({
      type: fc.constantFrom('success', 'error', 'warning', 'info' as const),
      message: fc.string(),
      duration: fc.option(fc.integer(), { nil: undefined }),
    }),
    { nil: null }
  ),
  isDarkMode: fc.boolean(),
  isExportingImage: fc.boolean(),
  currentFallbackRootName: fc.string(),
});

/**
 * Generator for Markdown strings (simulating mind map structure)
 */
export const markdownArb = fc
  .array(
    fc.oneof(
      fc.string({ minLength: 1 }).map((s) => `# ${s}`), // Root
      fc.string({ minLength: 1 }).map((s) => `## ${s}`), // Level 1
      fc.string({ minLength: 1 }).map((s) => `### ${s}`), // Level 2
      fc.string({ minLength: 1 }).map((s) => `- ${s}`), // List item
      fc.string({ minLength: 1 }).map((s) => `  - ${s}`) // Indented list item
    )
  )
  .map((lines) => lines.join('\n'));
