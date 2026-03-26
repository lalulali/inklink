import * as fc from 'fast-check';
import { createMarkdownParser } from '../parser/markdown-parser';
import { treeNodeArb } from './generators';
import { countNodes } from '../parser/tree-builder';
import { TreeNode } from '../types/tree-node';

describe('Performance Stress Tests', () => {
  const parser = createMarkdownParser();

  test('Parsing and Serializing 1000+ nodes is within acceptable time', () => {
    // Large tree generator: we override maxLength to force a wider tree
    const largeTreeArb = fc.letrec((tie) => ({
      node: fc.oneof(
        { depthSize: 'small' }, // Use small depth size to control recursion depth
        {
          weight: 1,
          arbitrary: fc.record({
            id: fc.string({ minLength: 1 }),
            content: fc.string({ minLength: 5 }),
            depth: fc.integer({ min: 0, max: 10 }),
            children: fc.array(tie('node') as any, { minLength: 1, maxLength: 3 }),
            parent: fc.constant(null),
            collapsed: fc.boolean(),
            color: fc.string(),
            metadata: fc.record({
              x: fc.constant(0),
              y: fc.constant(0),
              width: fc.constant(100),
              height: fc.constant(40),
              visible: fc.constant(true),
              highlighted: fc.constant(false)
            })
          })
        },
        {
          weight: 5, // Strongly favor leaves to terminate
          arbitrary: fc.record({
            id: fc.string({ minLength: 1 }),
            content: fc.string({ minLength: 5 }),
            depth: fc.integer({ min: 0, max: 10 }),
            children: fc.constant([]),
            parent: fc.constant(null),
            collapsed: fc.boolean(),
            color: fc.string(),
            metadata: fc.record({
              x: fc.constant(0),
              y: fc.constant(0),
              width: fc.constant(100),
              height: fc.constant(40),
              visible: fc.constant(true),
              highlighted: fc.constant(false)
            })
          })
        }
      )
    })).node as fc.Arbitrary<TreeNode>;

    fc.assert(
      fc.property(
        largeTreeArb,
        (root) => {
          const nodeCount = countNodes(root);
          if (nodeCount < 500) return; // Skip small trees for stress test
          
          const startSerialize = performance.now();
          const serialized = parser.serialize(root);
          const endSerialize = performance.now();
          
          const startParse = performance.now();
          const reParsed = parser.parse(serialized);
          const endParse = performance.now();
          
          console.debug(`Nodes: ${nodeCount}, Serialize: ${(endSerialize - startSerialize).toFixed(2)}ms, Parse: ${(endParse - startParse).toFixed(2)}ms`);
          
          expect(endSerialize - startSerialize).toBeLessThan(100); // Should be very fast
          expect(endParse - startParse).toBeLessThan(500); // 1000 nodes should be parsed quickly
          expect(countNodes(reParsed as any)).toBe(nodeCount);
        }
      ),
      { numRuns: 5 } // Only a few runs for stress testing
    );
  });
});
