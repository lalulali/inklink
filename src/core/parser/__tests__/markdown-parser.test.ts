
import { createMarkdownParser } from '../markdown-parser';

describe('MarkdownParser Node Initiator Rules', () => {
    const parser = createMarkdownParser();

    test('should only create nodes from headers and list markers', () => {
        const markdown = `- Constraint: Min. External Threshold.
        Logic: Total Payable - Internal Credit >= Rp10.000.
        If the remaining "External Outstanding" is < Rp10.000, the system must either:
        Force the user to pay 100% via Internal (if they have enough balance).
        Disable the "Partial Internal" option for that transaction.`;

        const root = parser.parse(markdown);
        
        // This confirms that all subsequent text is part of the same node
        expect(root.content).toContain('Constraint: Min. External Threshold.');
        expect(root.content).toContain('Logic: Total Payable - Internal Credit >= Rp10.000.');
        expect(root.content).toContain('Disable the "Partial Internal" option for that transaction.');
        expect(root.children.length).toBe(0);
    });

    test('should correctly build hierarchy when markers are present', () => {
        const markdown = `# Root
- Item 1
  Text for 1
  - Item 1.1
    Text for 1.1
- Item 2
  Text for 2`;

        const root = parser.parse(markdown);
        expect(root.content).toBe('Root');
        expect(root.children.length).toBe(2);
        
        const item1 = root.children[0];
        expect(item1.content).toBe('Item 1\nText for 1');
        expect(item1.children.length).toBe(1);
        
        const item11 = item1.children[0];
        expect(item11.content).toBe('Item 1.1\nText for 1.1');
        
        const item2 = root.children[1];
        expect(item2.content).toBe('Item 2\nText for 2');
    });

    test('should round-trip multiline content correctly with markers', () => {
        const markdown = `# Root
- Item 1
  with continuation
  - Nested
    more text`;

        const root = parser.parse(markdown);
        const serialized = parser.serialize(root);
        
        const reParsed = parser.parse(serialized);
        expect(reParsed.content).toBe('Root');
        expect(reParsed.children[0].content).toBe('Item 1\nwith continuation');
        expect(reParsed.children[0].children.length).toBe(1);
        expect(reParsed.children[0].children[0].content).toBe('Nested\nmore text');
    });
});
