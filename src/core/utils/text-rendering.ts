import { LAYOUT_CONFIG } from '../layout/layout-config';

export function getNoteBlockFontSize(depth: number): number {
  const scale = LAYOUT_CONFIG.BASE_SCALE;
  const base = depth === 0 ? 22 : depth === 1 ? 17 : depth === 2 ? 14 : 12;
  return base * scale;
}

export function getNoteBlockFontWeight(depth: number): string {
  if (depth === 0) return '600';
  if (depth === 1) return '500';
  return '400';
}

export function getNoteBlockLineHeight(depth: number): number {
  return getNoteBlockFontSize(depth) * 1.25;
}

/**
 * Shared text wrapping logic to ensure layout and renderer produce identical results.
 * This is Markdown-aware to ensure links and formatting are treated as atomic units.
 */
export function wrapText(
  text: string, 
  maxWidth: number, 
  fontSize: number, 
  fontWeight: string,
  measureFn: (txt: string, font: string) => number
): string[] {
  const cleanText = text.replace(/\[(codeblock|quoteblock|image|tableblock):\d+\]/g, '').trim();
  if (!cleanText && !text.includes('\n')) {
    return [];
  }

  const rawLines = text.split('\n');
  const wrapped: string[] = [];
  const font = `${fontWeight} ${fontSize}px Inter, sans-serif`;

  const atomicRegex = /(!?\[(?:[^\[\]]|\[[^\[\]]*\])*\]\([^)]+\)|\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|~~.*?~~)/g;

  rawLines.forEach(rawLine => {
    // Strip all internal placeholders (code, quote, image, table) for line counting. 
    const line = rawLine.replace(/\[(codeblock|quoteblock|image|tableblock):\d+\]/g, '').trimEnd();

    // Only skip if it was a placeholder line. If it was a natural blank line, keep it.
    if (!line && rawLine.match(/\[(codeblock|quoteblock|image|tableblock):\d+\]/)) return;

    if (!line) {
      wrapped.push('');
      return;
    }

    // Split line into atomic blocks and whitespace-aware tokens
    const parts = line.split(atomicRegex);
    const tokens: string[] = [];

    parts.forEach(part => {
      if (!part) return;
      if (part.match(atomicRegex)) {
        tokens.push(part);
      } else {
        tokens.push(...part.split(/(\s+)/).filter(Boolean));
      }
    });

    let currentLine = '';
    tokens.forEach(token => {
      if (!token) return;

      const testLine = currentLine + token;
      
      // For links and formatting, measure the visible text only for accurate visual wrapping.
      // This helper strips markdown syntax characters.
      let measureText = testLine;
      measureText = measureText
        .replace(/(!?\[)(.*?)( \].*?\))/g, '$2') // Strip links to label
        .replace(/(\*\*\*|\*\*|\*|~~)/g, '');    // Strip formatting
      
      const testWidth = measureFn(measureText, font);
      
      if (testWidth > maxWidth && currentLine) {
        wrapped.push(currentLine.trimEnd());
        currentLine = token;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      wrapped.push(currentLine.trimEnd());
    }
  });

  return wrapped.length === 0 ? [''] : wrapped;
}
