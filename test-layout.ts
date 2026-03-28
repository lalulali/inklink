import { TreeNode } from './src/core/types/tree-node';
import { LeftToRightLayout } from './src/core/layout/left-to-right-layout';
import { TwoSidedLayout } from './src/core/layout/two-sided-layout';
import { Viewport } from './src/core/types/interfaces';

const root: any = {
  id: 'root',
  content: 'hello',
  depth: 0,
  children: [
    {
      id: 'child1',
      content: 'how are you',
      depth: 1,
      children: [],
      parent: null,
      collapsed: false,
      color: '',
      metadata: { x: 0, y: 0, width: 100, height: 26, visible: true, highlighted: false }
    }
  ],
  parent: null,
  collapsed: false,
  color: '',
  metadata: { x: 0, y: 0, width: 50, height: 26, visible: true, highlighted: false }
};

const viewport: Viewport = { width: 1000, height: 1000 };

const ltr = new LeftToRightLayout({ levelSpacing: 100 });
const ltrPos = ltr.calculateLayout(root, viewport);
console.log('LTR Root:', ltrPos.get('root'));
console.log('LTR Child:', ltrPos.get('child1'));
console.log('LTR Gap:', ltrPos.get('child1')!.x - (ltrPos.get('root')!.x + 25));

const two = new TwoSidedLayout({ levelSpacing: 100 });
const twoPos = two.calculateLayout(root, viewport);
console.log('Two Root:', twoPos.get('root'));
console.log('Two Child:', twoPos.get('child1'));
// Since it is 1 child, it goes to TwoSided RIGHT branch.
console.log('Two Gap:', twoPos.get('child1')!.x - (twoPos.get('root')!.x + 25));

// Now simulate when width is NOT set initially!
const rootNoWidth: any = {
  id: 'root',
  content: 'hello',
  depth: 0,
  children: [
    {
      id: 'child1',
      content: 'how are you',
      depth: 1,
      children: [],
      parent: null,
      collapsed: false,
      color: '',
      metadata: { x: 0, y: 0, width: 0, height: 26, visible: true, highlighted: false }
    }
  ],
  parent: null,
  collapsed: false,
  color: '',
  metadata: { x: 0, y: 0, width: 0, height: 26, visible: true, highlighted: false }
};

const ltr2 = new LeftToRightLayout({ levelSpacing: 100 });
const ltrPos2 = ltr2.calculateLayout(rootNoWidth, viewport);
console.log('LTR2 Gap (No Width):', ltrPos2.get('child1')!.x - (ltrPos2.get('root')!.x + 25));
