import { TwoSidedLayout } from './two-sided-layout';
import { LeftToRightLayout } from './left-to-right-layout';
import { TreeNode } from '../types/tree-node';
import { Viewport } from '../types/interfaces';

/**
 * Basic test harness to verify all layout directions
 * run with 'npx ts-node'
 */
const mockViewport: Viewport = { width: 1920, height: 1080 };

const createNode = (id: string, content: string, depth: number, children: TreeNode[] = []): TreeNode => ({
  id,
  content,
  depth,
  children,
  parent: null,
  collapsed: false,
  color: '',
  metadata: {
    x: 0,
    y: 0,
    width: 100,
    height: 30,
    visible: true,
    highlighted: false
  }
});

const complexTree: TreeNode = createNode('root', 'Root', 0, [
  createNode('c1', 'Child 1', 1, [
    createNode('c1.1', 'G-Child 1.1', 2),
    createNode('c1.2', 'G-Child 1.2', 2)
  ]),
  createNode('c2', 'Child 2', 1),
  createNode('c3', 'Child 3', 1)
]);

function runTest(name: string, layout: any) {
  console.log(`--- Testing Layout: ${name} ---`);
  const positions = layout.calculateLayout(complexTree, mockViewport);
  const bounds = layout.getBounds(complexTree);
  
  console.log('Resulting Postions (ID -> {x,y}):');
  positions.forEach((pos: any, id: string) => {
    console.log(`${id}: { x: ${Math.round(pos.x)}, y: ${Math.round(pos.y)} }`);
  });
  console.log(`Bounds: minX=${Math.round(bounds.minX)}, maxX=${Math.round(bounds.maxX)}, minY=${Math.round(bounds.minY)}, maxY=${Math.round(bounds.maxY)}`);
}

// Dry run (non-execution in production)
/*
runTest('Two-Sided', new TwoSidedLayout());
runTest('L-R', new LeftToRightLayout());
*/
