
import { buildTree } from '../tree-builder';
import { IndentationType } from '../indentation';
import { TreeNode } from '../../types/tree-node';

describe('Image Parser and Tree Builder Integration', () => {
    const defaultParams = ['spaces' as const, 2] as const;

    test('should extract simple image ![]() and clean displayContent', () => {
        const lines = [{ text: '- Node with image ![alt text](https://example.com/image.png)', index: 0 }];
        const result = buildTree(lines, ...defaultParams);
        const node = result.root;

        expect(node.metadata.image).toBeDefined();
        expect(node.metadata.image?.url).toBe('https://example.com/image.png');
        expect(node.metadata.image?.alt).toBe('alt text');
        expect(node.metadata.displayContent).toBe('Node with image [image:0]');
    });

    test('should extract linked image [![]()]() and clean displayContent', () => {
        const lines = [{ text: '- [![alt](img.png)](link.com)', index: 0 }];
        const result = buildTree(lines, ...defaultParams);
        const node = result.root;

        expect(node.metadata.image).toBeDefined();
        expect(node.metadata.image?.url).toBe('img.png');
        expect(node.metadata.image?.alt).toBe('alt');
        expect(node.metadata.image?.link).toBe('link.com');
        expect(node.metadata.displayContent).toBe('[image:0]');
    });

    test('should handle multiple images and store the first one in metadata.image', () => {
        const lines = [
            { text: '- Multi ![img1](1.png) ![img2](2.png)', index: 0 }
        ];
        const result = buildTree(lines, ...defaultParams);
        const node = result.root;

        expect(node.metadata.image).toBeDefined();
        expect(node.metadata.image?.url).toBe('1.png');
        expect(node.metadata.displayContent).toBe('Multi [image:0] [image:1]');
    });

    test('should handle multi-line nodes with images', () => {
        const lines = [
            { text: '- Node Header', index: 0 },
            { text: '  Text line 1 with ![img1](1.png)', index: 1 },
            { text: '  Text line 2 with ![img2](2.png)', index: 2 }
        ];
        const result = buildTree(lines, ...defaultParams);
        const node = result.root;

        expect(node.metadata.image).toBeDefined();
        expect(node.metadata.image?.url).toBe('1.png');
        expect(node.metadata.displayContent).toContain('Node Header');
        expect(node.metadata.displayContent).toContain('Text line 1 with [image:0]');
        expect(node.metadata.displayContent).toContain('Text line 2 with [image:1]');
    });
});
