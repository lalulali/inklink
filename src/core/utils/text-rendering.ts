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
  // Pre-process: Handle <br> as newline and remove other blocks for measurement
  let processedText = text.replace(/<br\s*\/?>/gi, '\n');
  const cleanText = processedText.replace(/\[(codeblock|quoteblock|image|tableblock):\d+\]/g, '').trim();
  
  if (!cleanText && !processedText.includes('\n')) {
    return [];
  }

  const rawLines = processedText.split('\n');
  const wrapped: string[] = [];
  const font = `${fontWeight} ${fontSize}px Inter, sans-serif`;

  // Atomic regex extended to handle HTML tags including <a href>
  const atomicRegex = /(!?\[(?:[^\[\]]|\[[^\[\]]*\])*\]\([^)]+\)|\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|~~.*?~~|<a\b[^>]*>.*?<\/a>|<sub\b[^>]*>.*?<\/sub>|<sup\b[^>]*>.*?<\/sup>|<kbd\b[^>]*>.*?<\/kbd>|<mark\b[^>]*>.*?<\/mark>|<u\b[^>]*>.*?<\/u>|<span\b[^>]*>.*?<\/span>|<div\b[^>]*>.*?<\/div>|<p\b[^>]*>.*?<\/p>|<center\b[^>]*>.*?<\/center>|<details\b[^>]*>.*?<\/details>|<li>.*?<\/li>|<ul>.*?<\/ul>|<ol>.*?<\/ol>|<em>.*?<\/em>|<i>.*?<\/i>|<strong>.*?<\/strong>|<b>.*?<\/b>|<img\b[^>]*>|<image\b[^>]*>)/gi;

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
      
      // For links, formatting, and HTML tags, measure the visible text only.
      let measureText = testLine;
      measureText = measureText
        .replace(/(!?\[)(.*?)( \].*?\))/g, '$2') // Strip links to label
        .replace(/(\*\*\*|\*\*|\*|~~)/g, '')    // Strip formatting
        .replace(/<[^>]+>/g, '');                // Strip HTML tags for measurement
      
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

/**
 * Strips markdown and measures the visual width of a rich text line.
 */
export function measureRichTextWidth(
  line: string,
  fontSize: number,
  fontWeight: string,
  measureFn: (txt: string, font: string) => number
): number {
  if (!line) return 0;
  
  const segments = parseMarkdownLine(line);
  let totalWidth = 0;
  
  segments.forEach(seg => {
    const font = `${seg.bold ? 'bold ' : fontWeight} ${seg.italic ? 'italic ' : ''}${fontSize}px Inter, sans-serif`;
    totalWidth += measureFn(seg.text, font);
  });
  
  return totalWidth;
}

/**
 * Simple inline markdown parser for shared use in layout and renderer
 */
export function parseMarkdownLine(line: string): { 
  text: string; 
  bold?: boolean; 
  italic?: boolean; 
  strikethrough?: boolean; 
  underline?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  keyboard?: boolean;
  highlight?: boolean;
  link?: string;
  center?: boolean;
  details?: boolean;
}[] {
  const segments: any[] = [];

  if (!line) {
    return [{ text: '\u00A0' }];
  }

  // Regex matches: ***bolditalic***, **bold**, *italic*, ~~strike~~, [text](url), and HTML tags
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|~~.*?~~|\[.*?\]\(.*?\)|<a\b[^>]*>.*?<\/a>|<sub\b[^>]*>.*?<\/sub>|<sup\b[^>]*>.*?<\/sup>|<kbd\b[^>]*>.*?<\/kbd>|<mark\b[^>]*>.*?<\/mark>|<u\b[^>]*>.*?<\/u>|<span\b[^>]*>.*?<\/span>|<div\b[^>]*>.*?<\/div>|<p\b[^>]*>.*?<\/p>|<center\b[^>]*>.*?<\/center>|<details\b[^>]*>.*?<\/details>|<li>.*?<\/li>|<ul>.*?<\/ul>|<ol>.*?<\/ol>|<em>.*?<\/em>|<i>.*?<\/i>|<strong>.*?<\/strong>|<b>.*?<\/b>|<img\b[^>]*>|<image\b[^>]*>)/gi;
  const parts = line.split(regex);

  parts.forEach(part => {
    if (!part) return;

    if ((part.startsWith('[') || part.startsWith('![')) && part.includes('](')) {
      const isImage = part.startsWith('!');
      const lastClosingBracket = part.lastIndexOf(']');
      const title = part.substring(isImage ? 2 : 1, lastClosingBracket);
      const urlPart = part.substring(lastClosingBracket + 1);
      const url = urlPart.substring(1, urlPart.length - 1);
      segments.push({ text: isImage ? `!${title}` : title, link: url });
    } else if (part.startsWith('***') && part.endsWith('***')) {
      segments.push({ text: part.slice(3, -3), bold: true, italic: true });
    } else if (part.startsWith('**') && part.endsWith('**')) {
      segments.push({ text: part.slice(2, -2), bold: true });
    } else if (part.startsWith('*') && part.endsWith('*')) {
      segments.push({ text: part.slice(1, -1), italic: true });
    } else if (part.startsWith('~~') && part.endsWith('~~')) {
      segments.push({ text: part.slice(2, -2), strikethrough: true });
    } else if (/^<a\b[^>]*href=["'](.*?)["'][^>]*>(.*?)<\/a>$/i.test(part)) {
      const match = part.match(/^<a\b[^>]*href=["'](.*?)["'][^>]*>(.*?)<\/a>$/i);
      segments.push({ text: match ? match[2] : '', link: match ? match[1] : '' });
    } else if (/^<sub\b[^>]*>(.*?)<\/sub>$/i.test(part)) {
      segments.push({ text: part.replace(/^<sub\b[^>]*>(.*?)<\/sub>$/i, '$1'), subscript: true });
    } else if (/^<sup\b[^>]*>(.*?)<\/sup>$/i.test(part)) {
      segments.push({ text: part.replace(/^<sup\b[^>]*>(.*?)<\/sup>$/i, '$1'), superscript: true });
    } else if (/^<kbd\b[^>]*>(.*?)<\/kbd>$/i.test(part)) {
      segments.push({ text: part.replace(/^<kbd\b[^>]*>(.*?)<\/kbd>$/i, '$1'), keyboard: true });
    } else if (/^<mark\b[^>]*>(.*?)<\/mark>$/i.test(part)) {
      segments.push({ text: part.replace(/^<mark\b[^>]*>(.*?)<\/mark>$/i, '$1'), highlight: true });
    } else if (/^<u\b[^>]*>(.*?)<\/u>$/i.test(part)) {
      segments.push({ text: part.replace(/^<u\b[^>]*>(.*?)<\/u>$/i, '$1'), underline: true });
    } else if (/^<center\b[^>]*>(.*?)<\/center>$/i.test(part)) {
      segments.push({ text: part.replace(/^<center\b[^>]*>(.*?)<\/center>$/i, '$1'), center: true });
    } else if (/^<details\b[^>]*>(.*?)<\/details>$/i.test(part)) {
      // For details, we might just show the primary content or a "Spoiler" tag for now
      // Advanced implementation would require a custom nested block
      segments.push({ text: part.replace(/^<details\b[^>]*>(?:<summary\b[^>]*>(.*?)<\/summary>)?.*?<\/details>$/i, (_, p1) => p1 || 'Details'), details: true });
    } else if (/^<(span|div|p|em|i|strong|b|ul|ol|li)\b[^>]*>(.*?)<\/\1>$/i.test(part)) {
      const match = part.match(/^<(span|div|p|em|i|strong|b|ul|ol|li)\b[^>]*>(.*?)<\/\1>$/i);
      const tag = match ? match[1].toLowerCase() : '';
      const text = match ? match[2] : '';
      segments.push({ 
        text, 
        bold: tag === 'strong' || tag === 'b', 
        italic: tag === 'em' || tag === 'i' 
      });
    } else if (/^<(img|image)\b[^>]*\/?>$/i.test(part)) {
      // Stray image tag not caught by tree-builder (e.g. malformed or nested in ways we didn't extract)
      segments.push({ text: '' });
    } else {
      segments.push({ text: part });
    }
  });

  return segments;
}
