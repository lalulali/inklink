/**
 * Feature: Markdown Editor (CodeMirror)
 * Purpose: Provides a professional code-editor experience for markdown with syntax highlighting
 * Dependencies: @uiw/react-codemirror, @codemirror/lang-markdown, globalState
 */

"use client";

import React from 'react';
import CodeMirror, { EditorView, keymap, Decoration, DecorationSet, ViewUpdate, ViewPlugin } from '@uiw/react-codemirror';
import { Prec, EditorSelection } from '@codemirror/state';
import { markdown as mdLang } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { tags as t } from '@lezer/highlight';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { indentWithTab } from '@codemirror/commands';
import { globalState } from '@/core/state/state-manager';
import { createMarkdownParser } from '@/core/parser/markdown-parser';
import { ColorManager } from '@/core/theme/color-manager';
import { getRandomFunWord } from '@/core/constants/branding';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

// Custom theme to match Inklink aesthetic
const inklinkTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    backgroundColor: "transparent !important",
    outline: "none !important"
  },
  "&.cm-focused": {
    outline: "none !important"
  },
  ".cm-scroller": {
    height: "100% !important",
    outline: "none !important"
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "#6b7280", // text-muted-foreground
    display: "none" // Keep it clean by default
  },
  ".cm-content": {
    fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    padding: "1rem"
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "hsl(var(--primary))"
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "hsl(var(--primary) / 0.2) !important"
  },
  ".cm-activeLine": {
    backgroundColor: "hsl(var(--muted) / 0.3)"
  }
});

// Colorful light mode highlighting (OneDark inspired)
const lightColorfulHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, color: "#e45649", fontWeight: "bold" },
  { tag: t.heading2, color: "#d19a66", fontWeight: "bold" },
  { tag: t.heading3, color: "#986801", fontWeight: "bold" },
  { tag: [t.keyword, t.operator, t.typeName], color: "#a626a4" },
  { tag: [t.string, t.meta, t.regexp], color: "#50a14f" },
  { tag: [t.variableName, t.propertyName], color: "#4078f2" },
  { tag: [t.className, t.constant(t.variableName)], color: "#986801" },
  { tag: t.comment, color: "#a0a1a7", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#4078f2", textDecoration: "underline" },
  { tag: t.url, color: "#0184bc" },
  { tag: t.monospace, color: "#50a14f" },
]);

export function MarkdownEditor() {
  const [value, setValue] = React.useState(globalState.getState().markdown);
  const { resolvedTheme } = useTheme();
  const parser = React.useMemo(() => createMarkdownParser(), []);
  const editorRef = React.useRef<any>(null);
  const isDark = resolvedTheme === 'dark';

  React.useEffect(() => {
    return globalState.subscribe(state => {
      if (state.markdown !== value) {
        setValue(state.markdown);
      }
    });
  }, [value]);

  const wasMultiRootRef = React.useRef(false);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const processUpdate = React.useCallback((val: string) => {
    try {
      const state = globalState.getState();
      const effectivelyEmpty = val
        .split('\n')
        .map(line => line.trim().replace(/^(#+|-|\*|\+|\d+\.)\s*/, ''))
        .join('')
        .trim().length === 0;

      if (effectivelyEmpty) {
        globalState.setState({ markdown: val, tree: null, isDirty: true });
        wasMultiRootRef.current = false;
        return;
      }
      
      const fileName = state.currentFile?.name?.replace(/\.[^/.]+$/, "");
      
      // Peek preview of orphans count to see if we'll need a virtual root
      // Or just parse once and see if we get a virtual_root
      let tree = parser.parse(val, fileName || state.currentFallbackRootName);
      const isMultiRoot = tree.id === 'virtual_root';

      // If we just became multi-root and have no filename, pick a NEW fun word
      if (isMultiRoot && !wasMultiRootRef.current && !fileName) {
        const newName = getRandomFunWord();
        // Re-parse with the new name for immediate effect
        tree = parser.parse(val, newName);
        globalState.setState({ 
          markdown: val, 
          tree, 
          isDirty: true, 
          currentFallbackRootName: newName 
        });
      } else {
        globalState.setState({ markdown: val, tree, isDirty: true });
      }

      wasMultiRootRef.current = isMultiRoot;
      ColorManager.assignBranchColors(tree);
    } catch (err) {
      globalState.setState({ markdown: val, tree: null, isDirty: true });
      wasMultiRootRef.current = false;
    }
  }, [parser]);

  const lastParseTimeRef = React.useRef<number>(0);

  const onChange = React.useCallback((val: string) => {
    setValue(val);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const now = Date.now();
    // Immediate parse if it's been more than 500ms since last parse (start of typing)
    if (now - lastParseTimeRef.current > 500) {
      processUpdate(val);
      lastParseTimeRef.current = now;
    } else {
      debounceTimerRef.current = setTimeout(() => {
        processUpdate(val);
        lastParseTimeRef.current = Date.now();
      }, 50); // Aggressive 50ms debounce for near real-time feel
    }
  }, [processUpdate]);

  // Handle programmatic reveals (from canvas double click)
  React.useEffect(() => {
    const handleReveal = (e: any) => {
      const { content, nodeId } = e.detail;
      if (!editorRef.current?.view) return;
      
      const view = editorRef.current.view;
      const state = view.state;
      
      // Attempt 1: If ID is in "line_N" format, jump directly to line
      if (nodeId && nodeId.startsWith('line_')) {
        const lineIdx = parseInt(nodeId.replace('line_', ''));
        // CodeMirror lines are 1-based
        const lineNum = lineIdx + 1;
        
        if (lineNum <= state.doc.lines) {
          try {
            const line = state.doc.line(lineNum);
            // Search for content within that line or nearby
            const findIndex = line.text.indexOf(content);
            const anchor = findIndex !== -1 ? line.from + findIndex : line.from;
            const head = findIndex !== -1 ? anchor + content.length : line.to;

            view.dispatch({
              selection: { anchor, head },
              scrollIntoView: true,
              userEvent: 'select.reveal'
            });
            
            view.focus();
            return;
          } catch (e) {
            console.error('Failed to jump to line by index:', e);
          }
        }
      }

      // Attempt 2: Fallback to global string search if index is invalid or virtual
      const doc = state.doc.toString();
      const index = doc.indexOf(content);
      if (index !== -1) {
        view.dispatch({
          selection: { anchor: index, head: index + content.length },
          scrollIntoView: true,
          userEvent: 'select.reveal'
        });
        view.focus();
      }
    };

    window.addEventListener('inklink-editor-reveal', handleReveal);
    return () => window.removeEventListener('inklink-editor-reveal', handleReveal);
  }, []);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle clicking on the empty area of the editor to focus it
  const handleContainerClick = () => {
    if (editorRef.current?.view) {
      editorRef.current.view.focus();
    }
  };

  // Keymap for "Linter Level" behaviors
  const customKeymap = keymap.of([
    {
      key: "Mod-b",
      run: (view) => {
        const { state } = view;
        const main = state.selection.main;
        const text = state.sliceDoc(main.from, main.to);
        
        // Toggle logic
        if (text.startsWith('**') && text.endsWith('**')) {
          const insert = text.slice(2, -2);
          view.dispatch({
            changes: { from: main.from, to: main.to, insert },
            selection: { anchor: main.from, head: main.to - 4 } // Adjust selection
          });
        } else {
          const insert = `**${text}**`;
          view.dispatch({
            changes: { from: main.from, to: main.to, insert },
            selection: { anchor: main.from + 2, head: main.to + 2 }
          });
        }
        return true;
      }
    },
    {
      key: "Mod-i",
      run: (view) => {
        const { state } = view;
        const main = state.selection.main;
        const text = state.sliceDoc(main.from, main.to);
        
        // Toggle logic
        if (text.startsWith('*') && text.endsWith('*') && !text.startsWith('**')) {
          const insert = text.slice(1, -1);
          view.dispatch({
            changes: { from: main.from, to: main.to, insert },
            selection: { anchor: main.from, head: main.to - 2 }
          });
        } else {
          const insert = `*${text}*`;
          view.dispatch({
            changes: { from: main.from, to: main.to, insert },
            selection: { anchor: main.from + 1, head: main.to + 1 }
          });
        }
        return true;
      }
    },
    {
      key: "Mod-Shift-x",
      run: (view) => {
        const { state } = view;
        const main = state.selection.main;
        const text = state.sliceDoc(main.from, main.to);
        
        // Toggle logic
        if (text.startsWith('~~') && text.endsWith('~~')) {
          const insert = text.slice(2, -2);
          view.dispatch({
            changes: { from: main.from, to: main.to, insert },
            selection: { anchor: main.from, head: main.to - 4 }
          });
        } else {
          const insert = `~~${text}~~`;
          view.dispatch({
            changes: { from: main.from, to: main.to, insert },
            selection: { anchor: main.from + 2, head: main.to + 2 }
          });
        }
        return true;
      }
    },
    {
      key: "Shift-Enter",
      run: (view) => {
        const { state } = view;
        const main = state.selection.main;
        if (!main.empty) return false;
        
        const line = state.doc.lineAt(main.head);
        const text = line.text;
        
        // Match markers at the START of the physical line
        const match = /^(\s*)(?:(?:\*|-|\+|\d+\.|#+)\s+)/.exec(text);
        let indent = "";
        
        if (match) {
          // Rule: If we are on a marker line, Shift-Enter indents to the text start
          indent = " ".repeat(match[0].length);
        } else {
          // Rule: If we are already on an indented line (no marker), just preserve indentation
          const wsMatch = /^(\s*)/.exec(text);
          indent = wsMatch ? wsMatch[0] : "";
        }
        
        view.dispatch({
          changes: { from: main.head, insert: "\n" + indent },
          selection: { anchor: main.head + 1 + indent.length },
          scrollIntoView: true
        });
        return true;
      }
    },
    {
      key: "Enter",
      run: (view) => {
        const { state } = view;
        const head = state.selection.main.head;
        const line = state.doc.lineAt(head);
        const text = line.text;
        
        // 1. Match empty markers for outdenting (existing behavior)
        const emptyMarkerMatch = text.match(/^(\s*)(\*|-|\+|\d+\.)\s*$/);
        if (emptyMarkerMatch) {
          const indent = emptyMarkerMatch[1];
          if (indent.length >= 2) {
            const newIndent = indent.substring(2);
            const marker = emptyMarkerMatch[2];
            view.dispatch({
              changes: { from: line.from, to: line.to, insert: newIndent + marker + " " },
              selection: { anchor: line.from + newIndent.length + marker.length + 1 }
            });
            return true;
          } else {
            view.dispatch({
              changes: { from: line.from, to: line.to, insert: "" },
              selection: { anchor: line.from }
            });
            return false;
          }
        }

        // 2. Auto-continue list behavior (Direct marker on current line)
        const continueMatch = text.match(/^(\s*)(\*|-|\+|\d+\.)\s+(.+)$/);
        if (continueMatch) {
          const indent = continueMatch[1];
          let marker = continueMatch[2];
          if (/^\d+\.$/.test(marker)) {
            marker = (parseInt(marker) + 1) + ".";
          }
          const prefix = `\n${indent}${marker} `;
          view.dispatch({
            changes: { from: head, insert: prefix },
            selection: { anchor: head + prefix.length }
          });
          return true;
        }

        // 3. New behavior: Shift-Enter was used previously (current line is purely indented)
        // If the current line is indented but has NO marker, we look UP to find the parent marker
        const pureIndentMatch = /^(\s+)[^\s\*\-\+#\d]/.exec(text);
        if (pureIndentMatch) {
          const currentIndent = pureIndentMatch[1];
          // Search backwards for the line that started this list item
          for (let l = line.number - 1; l >= 1; l--) {
            const prevLine = state.doc.line(l);
            const prevText = prevLine.text;
            const markerMatch = /^(\s*)(\*|-|\+|\d+\.)\s+/.exec(prevText);
            
            if (markerMatch) {
              const markerIndent = markerMatch[1];
              let marker = markerMatch[2];
              
              // Only continue if the indentation level matches or is smaller
              // (indicating this was the parent list item)
              if (currentIndent.length >= markerIndent.length + marker.length + 1) {
                if (/^\d+\.$/.test(marker)) {
                  marker = (parseInt(marker) + 1) + ".";
                }
                const prefix = `\n${markerIndent}${marker} `;
                view.dispatch({
                  changes: { from: head, insert: prefix },
                  selection: { anchor: head + prefix.length }
                });
                return true;
              }
              break; // Found a marker but it doesn't match the hierarchy
            }
            // If we find a heading or empty line, stop searching
            if (/^#+/.test(prevText.trim()) || prevText.trim() === "") break;
          }
        }

        return false;
      }
    },
    {
      key: "Backspace",
      run: (view) => {
        const { state } = view;
        const head = state.selection.main.head;
        const line = state.doc.lineAt(head);
        
        // Only trigger if cursor is at the end of an empty-looking marker line
        if (head !== line.to) return false;

        const emptyMarkerMatch = line.text.match(/^(\s*)(\*|-|\+|\d+\.)\s$/);
        const spacesMatch = line.text.match(/^(\s+)$/);

        if (emptyMarkerMatch) {
          const indent = emptyMarkerMatch[1];
          const marker = emptyMarkerMatch[2];
          if (indent.length >= 2) {
            // Outdent
            const newIndent = indent.substring(2);
            view.dispatch({
              changes: { from: line.from, to: line.to, insert: newIndent + marker + " " },
              selection: { anchor: line.from + newIndent.length + marker.length + 1 }
            });
            return true;
          } else {
            // Clear
            view.dispatch({
              changes: { from: line.from, to: line.to, insert: "" },
              selection: { anchor: line.from }
            });
            return true;
          }
        } else if (spacesMatch) {
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: "" },
            selection: { anchor: line.from }
          });
          return true;
        }
        return false;
      }
    }
  ]);

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="flex h-10 items-center border-b px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
        Markdown Editor
      </div>
      <div 
        className="flex-1 overflow-y-auto cursor-text min-h-0 sleek-scrollbar" 
        onClick={handleContainerClick}
      >
        <CodeMirror
          ref={editorRef}
          value={value}
          height="100%"
          theme={isDark ? oneDark : 'light'}
          extensions={[
            mdLang({ codeLanguages: languages }),
            EditorView.lineWrapping,
            inklinkTheme,
            !isDark ? syntaxHighlighting(lightColorfulHighlightStyle) : [],
            Prec.highest(customKeymap),
            keymap.of([indentWithTab])
          ]}
          onChange={onChange}
          placeholder="# Start typing your mind map here..."
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: false,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
