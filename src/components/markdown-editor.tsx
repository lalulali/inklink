/**
 * Feature: Markdown Editor
 * Purpose: Provides a text area for direct markdown editing linked to the mind map
 * Dependencies: globalState from core/state, createMarkdownParser from core/parser
 */

"use client";

import React from 'react';
import { globalState } from '@/core/state/state-manager';
import { createMarkdownParser } from '@/core/parser/markdown-parser';
import { cn } from '@/lib/utils';

export function MarkdownEditor() {
  const [markdown, setMarkdown] = React.useState(globalState.getState().markdown);
  const parser = React.useMemo(() => createMarkdownParser(), []);

  React.useEffect(() => {
    return globalState.subscribe(state => {
      setMarkdown(state.markdown);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMarkdown = e.target.value;
    setMarkdown(newMarkdown);
    
    try {
      const tree = parser.parse(newMarkdown);
      globalState.setState({ markdown: newMarkdown, tree, isDirty: true });
    } catch (err) {
      // Parser error - we keep the markdown but don't update the tree
      globalState.setState({ markdown: newMarkdown, isDirty: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (e.key === 'Tab') {
      e.preventDefault();
      
      const isShift = e.shiftKey;
      const textBefore = markdown.substring(0, start);
      const lineStart = textBefore.lastIndexOf('\n') + 1;
      const textAfter = markdown.substring(end);
      
      // Get all lines encompassed by the selection
      const fullSelection = markdown.substring(lineStart, end);
      const lines = markdown.substring(lineStart, end + (end === start ? 0 : 0)).split('\n');
      // If we are at the end of a line, we still want to indent that line.
      // A more robust way:
      const selectionWithStartOfLine = markdown.substring(lineStart, end);
      const selectionLines = selectionWithStartOfLine.split('\n');

      let newText = '';
      let totalChange = 0;

      if (!isShift) {
        // Indent
        newText = selectionLines.map(line => '  ' + line).join('\n');
        totalChange = selectionLines.length * 2;
      } else {
        // De-indent
        newText = selectionLines.map(line => {
          if (line.startsWith('  ')) {
            totalChange -= 2;
            return line.substring(2);
          } else if (line.startsWith(' ')) {
            totalChange -= 1;
            return line.substring(1);
          } else if (line.startsWith('\t')) {
            totalChange -= 1;
            return line.substring(1);
          }
          return line;
        }).join('\n');
      }

      const newMarkdown = markdown.substring(0, lineStart) + newText + textAfter;
      setMarkdown(newMarkdown);
      
      try {
        const tree = parser.parse(newMarkdown);
        globalState.setState({ markdown: newMarkdown, tree, isDirty: true });
      } catch (err) {
        globalState.setState({ markdown: newMarkdown, isDirty: true });
      }

      // Restore selection
      setTimeout(() => {
        textarea.setSelectionRange(
          start + (isShift ? (markdown.substring(lineStart, start).startsWith('  ') ? -2 : 0) : 2),
          end + totalChange
        );
      }, 0);
    } 
    else if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      
      // Find the start of the current line
      const textBefore = markdown.substring(0, start);
      const linesBefore = textBefore.split('\n');
      const currentLine = linesBefore[linesBefore.length - 1];
      
      // Match leading whitespace and list marker
      const match = currentLine.match(/^(\s*)(\*|-|\+|\d+\.)\s+/);
      const emptyMarkerMatch = currentLine.match(/^(\s*)(\*|-|\+|\d+\.)\s*$/);

      if (emptyMarkerMatch) {
          // If user hits enter on an empty marker, outdent it or clear it (escape list)
          e.preventDefault();
          const indent = emptyMarkerMatch[1];
          const lineStart = start - currentLine.length;
          
          if (indent.length >= 2) {
              // Outdent by 2 spaces
              const newIndent = indent.substring(2);
              const marker = emptyMarkerMatch[2];
              const newMarkdown = markdown.substring(0, lineStart) + newIndent + marker + ' ' + markdown.substring(start);
              setMarkdown(newMarkdown);
              
              try {
                  const tree = parser.parse(newMarkdown);
                  globalState.setState({ markdown: newMarkdown, tree, isDirty: true });
              } catch (err) {
                  globalState.setState({ markdown: newMarkdown, isDirty: true });
              }
              
              setTimeout(() => {
                  textarea.selectionStart = textarea.selectionEnd = lineStart + newIndent.length + marker.length + 1;
              }, 0);
          } else {
              // Clear the marker
              const newMarkdown = markdown.substring(0, lineStart) + '\n' + markdown.substring(start);
              setMarkdown(newMarkdown);
              globalState.setState({ markdown: newMarkdown, isDirty: true });
              setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = lineStart + 1;
              }, 0);
          }
      } else if (match) {
          // Continue the list
          e.preventDefault();
          const indent = match[1];
          let marker = match[2];
          
          // Increment numbered list
          if (/^\d+\.$/.test(marker)) {
              marker = (parseInt(marker) + 1) + '.';
          }
          
          const prefix = `\n${indent}${marker} `;
          const newMarkdown = markdown.substring(0, start) + prefix + markdown.substring(start);
          setMarkdown(newMarkdown);
          
          const tree = parser.parse(newMarkdown);
          globalState.setState({ markdown: newMarkdown, tree, isDirty: true });
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
          }, 0);
      }
    } else if (e.key === 'Backspace') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start === end) {
        // Find the text before the cursor on the current line
        const textBefore = markdown.substring(0, start);
        const linesBefore = textBefore.split('\n');
        const currentLine = linesBefore[linesBefore.length - 1];
        
        // If the current line before the cursor is just whitespace or a list marker
        const emptyMarkerMatch = currentLine.match(/^\s*(\*|-|\+|\d+\.)\s$/);
        const spacesMatch = currentLine.match(/^(\s+)$/);
        
        if (emptyMarkerMatch) {
          e.preventDefault();
          const indent = emptyMarkerMatch[1];
          const lineStart = start - currentLine.length;
          
          if (indent.length >= 2) {
            // Outdent
            const newIndent = indent.substring(2);
            const marker = emptyMarkerMatch[2];
            const newMarkdown = markdown.substring(0, lineStart) + newIndent + marker + ' ' + markdown.substring(start);
            setMarkdown(newMarkdown);
            try {
              const tree = parser.parse(newMarkdown);
              globalState.setState({ markdown: newMarkdown, tree, isDirty: true });
            } catch (err) {
              globalState.setState({ markdown: newMarkdown, isDirty: true });
            }
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = lineStart + newIndent.length + marker.length + 1;
            }, 0);
          } else {
            // Clear
            const newMarkdown = markdown.substring(0, lineStart) + markdown.substring(start);
            setMarkdown(newMarkdown);
            try {
              const tree = parser.parse(newMarkdown);
              globalState.setState({ markdown: newMarkdown, tree, isDirty: true });
            } catch (err) {
              globalState.setState({ markdown: newMarkdown, isDirty: true });
            }
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = lineStart;
            }, 0);
          }
        } else if (spacesMatch) {
          e.preventDefault();
          const lineStart = start - currentLine.length;
          const newMarkdown = markdown.substring(0, lineStart) + markdown.substring(start);
          setMarkdown(newMarkdown);
          globalState.setState({ markdown: newMarkdown, isDirty: true });
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
          }, 0);
        }
      }
    }
  };

  return (
    <div className="flex h-full flex-col border-r bg-muted/30">
      <div className="flex h-10 items-center border-b px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
        Markdown Editor
      </div>
      <textarea
        className={cn(
          "flex-1 resize-none bg-transparent p-4 font-mono text-sm outline-none transition-colors",
          "focus:bg-background"
        )}
        spellCheck={false}
        value={markdown}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="# Your Mind Map Starts Here..."
      />
    </div>
  );
}
