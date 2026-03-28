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

const two = new TwoSidedLayout({ levelSpacing: 100 });
const twoPos = two.calculateLayout(root, viewport);

const getPath = (positions: any, sWidth: number) => {
  const sPos = positions.get('root');
  const tPos = positions.get('child1');
  let sX = tPos.x < sPos.x ? sPos.x - sWidth / 2 : sPos.x + sWidth / 2;
  const tX = tPos.x;
  return `M${sX},${sPos.y} -> ${tX},${tPos.y} (Distance: ${tX - sX})`;
};

console.log('LTR path:', getPath(ltrPos, 50));
console.log('Two path:', getPath(twoPos, 50));
