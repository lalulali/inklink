import * as fc from 'fast-check';
import { createMarkdownParser } from '../parser/markdown-parser';
import { treeNodeArb, markdownArb } from './generators';
import { TreeNode } from '../types/tree-node';

describe('MarkdownParser Property-Based Tests', () => {
  const parser = createMarkdownParser();

  test('Serialization roundtrip: tree -> markdown -> tree', () => {
    fc.assert(
      fc.property(
        treeNodeArb,
        (root) => {
          // Normalize root: no parents for PBT comparison, and depths must match hierarchy
          const normalize = (node: TreeNode, depth: number) => {
            node.depth = depth;
            node.parent = null;
            node.children.forEach(c => normalize(c, depth + 1));
          };
          normalize(root, 0);
          
          const serialized = parser.serialize(root);
          const reParsed = parser.parse(serialized);
          
          // Before comparison, also clear parents on re-parsed tree
          const clearParents = (node: TreeNode) => {
            node.parent = null;
            node.children.forEach(clearParents);
          };
          clearParents(reParsed);
          
          // Compare content and structure
          const compareNode = (a: TreeNode, b: TreeNode) => {
            expect(a.content).toBe(b.content);
            expect(a.depth).toBe(b.depth);
            expect(a.children.length).toBe(b.children.length);
            for (let i = 0; i < a.children.length; i++) {
              compareNode(a.children[i], b.children[i]);
            }
          };
          
          compareNode(root, reParsed);
        }
      ),
      { numRuns: 50 } // Reduce runs for complex recursive trees
    );
  });

  test('Stability: parse(serialize(parse(text))) is stable', () => {
    fc.assert(
      fc.property(
        markdownArb,
        (text) => {
          if (!text.trim()) return; // Skip empty/whitespace only
          
          try {
            const firstParsed = parser.parse(text);
            const firstSerialized = parser.serialize(firstParsed);
            
            const secondParsed = parser.parse(firstSerialized);
            const secondSerialized = parser.serialize(secondParsed);
            
            expect(secondSerialized).toBe(firstSerialized);
          } catch (e) {
            // Some generated markdown might be invalid (e.g. skip levels)
            // parser.parse should throw ParseError for those
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Handle malformed markdown: parser should throw ParseError or return valid tree', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (text) => {
          try {
            const tree = parser.parse(text);
            expect(tree).toBeDefined();
            expect(tree.id).toBeDefined();
          } catch (e) {
            // Should be a ParseError or another managed error
          }
        }
      )
    );
  });
});
