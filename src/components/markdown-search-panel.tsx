/**
 * Feature: Markdown Search Panel
 * Purpose: Provides a VS Code-style find and replace interface for the editor
 * Design: Minimal, dark/light theme aware, positioned at the top-right of the editor
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  XIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  ChevronRightIcon,
  ReplaceIcon,
  ReplaceAllIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  SearchIcon,
  FilterIcon,
  WholeWord,
  Regex
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { globalState } from '@/core/state/state-manager';
import { EditorView } from '@codemirror/view';
import { 
  setSearchQuery, 
  SearchQuery, 
  findNext, 
  findPrevious, 
  replaceNext, 
  replaceAll,
  openSearchPanel
} from "@codemirror/search";

interface MarkdownSearchPanelProps {
  view: EditorView | null;
}

export function MarkdownSearchPanel({ view }: MarkdownSearchPanelProps) {
  const [state, setState] = useState(globalState.getState());
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return globalState.subscribe(s => setState(s));
  }, []);

  // Listen for focus requests
  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => findInputRef.current?.focus(), 50);
    };
    window.addEventListener('inklink-focus-editor-search', handleFocus);
    // Also focus on initial open
    if (state.isEditorSearchOpen) handleFocus();
    
    return () => window.removeEventListener('inklink-focus-editor-search', handleFocus);
  }, [state.isEditorSearchOpen]);

  // Listen for editor search toggle event
  useEffect(() => {
    const handleToggle = () => {
      globalState.setState({ isEditorSearchOpen: true, isEditorReplaceOpen: false });
    };
    window.addEventListener('inklink-editor-search', handleToggle);
    return () => window.removeEventListener('inklink-editor-search', handleToggle);
  }, []);
  
  // Cleanup search state on unmount
  useEffect(() => {
    return () => {
        if (view) {
            view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "" })) });
        }
    };
  }, [view]);

  // Sync state to CodeMirror when modifiers change
  useEffect(() => {
    if (!view) return;
    
    const query = new SearchQuery({
      search: state.editorSearchRegex ? state.editorSearchQuery.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r') : state.editorSearchQuery,
      replace: state.editorSearchRegex ? state.editorReplaceQuery.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r') : state.editorReplaceQuery,
      caseSensitive: state.editorSearchCaseSensitive,
      wholeWord: state.editorSearchWholeWord,
      regexp: state.editorSearchRegex,
    });
    
    if (state.editorSearchQuery === "" && view.state.selection.main.from !== view.state.selection.main.to) {
        view.dispatch({ selection: { anchor: view.state.selection.main.head } });
    }
    
    view.dispatch({ effects: setSearchQuery.of(query) });
  }, [
    state.editorSearchQuery, 
    state.editorReplaceQuery, 
    state.editorSearchCaseSensitive, 
    state.editorSearchWholeWord, 
    state.editorSearchRegex,
    view
  ]);

  const handleClose = () => {
    globalState.setState({ isEditorSearchOpen: false });
  };

  const handleToggleReplace = () => {
    globalState.setState({ isEditorReplaceOpen: !state.isEditorReplaceOpen });
    if (!state.isEditorReplaceOpen) {
      setTimeout(() => replaceInputRef.current?.focus(), 50);
    }
  };

  const getMatches = (view: EditorView) => {
    const docText = view.state.doc.toString();
    const queryStr = state.editorSearchQuery;
    if (!queryStr) return [];
    
    const matches: {from: number, to: number}[] = [];
    try {
        if (state.editorSearchRegex) {
            const flags = state.editorSearchCaseSensitive ? 'g' : 'gi';
            const unescapedQuery = queryStr.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
            const re = new RegExp(unescapedQuery, flags);
            let match;
            while ((match = re.exec(docText)) !== null) {
                matches.push({ from: match.index, to: match.index + match[0].length });
                if (match.index === re.lastIndex) re.lastIndex++;
            }
        } else {
            const searchLower = state.editorSearchCaseSensitive ? queryStr : queryStr.toLowerCase();
            const textLower = state.editorSearchCaseSensitive ? docText : docText.toLowerCase();
            let pos = 0;
            while ((pos = textLower.indexOf(searchLower, pos)) !== -1) {
                matches.push({ from: pos, to: pos + searchLower.length });
                pos += 1;
            }
        }
    } catch (e) {}
    return matches;
  };

  const onFindNext = () => {
    if (!view) return;
    const matches = getMatches(view);
    if (matches.length === 0) return;
    
    const selection = view.state.selection.main;
    let nextMatch = matches.find(m => m.from > selection.from);
    if (!nextMatch) nextMatch = matches[0]; // Wrap around
    
    view.dispatch({
        selection: { anchor: nextMatch.from, head: nextMatch.to },
        scrollIntoView: true,
        userEvent: 'select.search'
    });
  };

  const onFindPrev = () => {
    if (!view) return;
    const matches = getMatches(view);
    if (matches.length === 0) return;
    
    const selection = view.state.selection.main;
    let prevMatch = [...matches].reverse().find(m => m.from < selection.from);
    if (!prevMatch) prevMatch = matches[matches.length - 1]; // Wrap around
    
    view.dispatch({
        selection: { anchor: prevMatch.from, head: prevMatch.to },
        scrollIntoView: true,
        userEvent: 'select.search'
    });
  };

  // Helper to match capitalization pattern of original text
  const applyPreserveCase = (original: string, replacement: string) => {
    if (!state.editorReplacePreserveCase) return replacement;
    
    // Pattern 1: ALL CAPS
    if (original === original.toUpperCase() && original !== original.toLowerCase()) {
      return replacement.toUpperCase();
    }
    // Pattern 2: Title Case / First letter capitalized
    if (original.length > 0 && original[0] === original[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    // Pattern 3: lowercase
    if (original === original.toLowerCase()) {
      return replacement.toLowerCase();
    }
    
    return replacement;
  };

  /**
   * Helper to handle regex escape sequences in replace strings
   * VS Code and other editors allow \n, \t, etc in regex replace
   */
  const processReplacement = (original: string, replacement: string) => {
    let result = replacement;
    if (state.editorSearchRegex) {
        // Convert \n, \t, \r to literal characters
        result = result.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
    }
    return applyPreserveCase(original, result);
  };

  const onReplace = () => {
    if (!view) return;
    const { state: editorState } = view;
    const query = new SearchQuery({
        search: state.editorSearchQuery,
        caseSensitive: state.editorSearchCaseSensitive,
        wholeWord: state.editorSearchWholeWord,
        regexp: state.editorSearchRegex,
    });
    
    if (state.editorReplacePreserveCase) {
        // Custom replace implementation for preserve case
        const selection = editorState.selection.main;
        const cursor = query.getCursor(editorState.doc);
        
        let match = null;
        while (true) {
            const { done, value } = cursor.next();
            if (done) break;
            
            // If the selection matches exactly or we found the first one after the cursor
            if (value.from === selection.from && value.to === selection.to) {
                match = value;
                break;
            }
            if (value.from > selection.from) {
                match = value;
                break;
            }
        }
        
        if (match) {
            const original = editorState.sliceDoc(match.from, match.to);
            const replacement = processReplacement(original, state.editorReplaceQuery);
            view.dispatch({
                changes: { from: match.from, to: match.to, insert: replacement },
                selection: { anchor: match.from + replacement.length },
                scrollIntoView: true,
                userEvent: 'input.replace'
            });
            // Focus next match automatically after replace (Standard VS behavior)
            setTimeout(() => onFindNext(), 10);
        } else {
            // If no match found after cursor, wrap around to beginning
            onFindNext();
        }
    } else {
        replaceNext(view);
    }
  };

  const onReplaceAll = () => {
    if (!view) return;
    if (state.editorReplacePreserveCase) {
        const { state: editorState } = view;
        const query = new SearchQuery({
            search: state.editorSearchQuery,
            caseSensitive: state.editorSearchCaseSensitive,
            wholeWord: state.editorSearchWholeWord,
            regexp: state.editorSearchRegex,
        });
        
        const cursor = query.getCursor(editorState.doc);
        const changes = [];
        
        while (true) {
            const { done, value } = cursor.next();
            if (done) break;
            
            const original = editorState.sliceDoc(value.from, value.to);
            const replacement = processReplacement(original, state.editorReplaceQuery);
            changes.push({ from: value.from, to: value.to, insert: replacement });
        }
        
        if (changes.length > 0) {
            view.dispatch({
                changes,
                userEvent: 'input.replace.all'
            });
        }
    } else {
        replaceAll(view);
    }
  };

  if (!state.isEditorSearchOpen) return null;

  return (
    <div 
      className={cn(
        "flex flex-col gap-2 border-b bg-card px-4 py-2 transition-all duration-200 w-full min-h-10",
        "border-border/40 animate-in slide-in-from-top-1 fade-in"
      )}
      id="inklink-editor-search-panel"
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
      }}
    >
      {/* Row 1: Find */}
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 shrink-0 hover:bg-muted"
          onClick={handleToggleReplace}
          title={state.isEditorReplaceOpen ? "Hide Replace" : "Show Replace"}
        >
          {state.isEditorReplaceOpen ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </Button>

        <div className="relative flex-[2] min-w-0 md:max-w-[300px] group">
          <Input 
            ref={findInputRef}
            autoFocus
            value={state.editorSearchQuery}
            onChange={(e) => globalState.setState({ editorSearchQuery: e.target.value })}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        onFindPrev();
                    } else if (e.altKey) {
                        view && window.dispatchEvent(new CustomEvent('inklink-editor-select-all-search'));
                    } else {
                        onFindNext();
                    }
                }
            }}
            placeholder="Find"
            className="h-7 w-full border-border/50 bg-background/50 pl-2 pr-20 text-xs focus-visible:ring-1 focus-visible:ring-primary shadow-none rounded-sm"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <SearchModifierButton 
              label="Aa" 
              active={state.editorSearchCaseSensitive} 
              onClick={() => globalState.setState({ editorSearchCaseSensitive: !state.editorSearchCaseSensitive })}
              tooltip="Match Case"
            />
            <SearchModifierButton 
              label={<WholeWord className="h-3 w-3" />} 
              active={state.editorSearchWholeWord} 
              onClick={() => globalState.setState({ editorSearchWholeWord: !state.editorSearchWholeWord })}
              tooltip="Match Whole Word"
            />
            <SearchModifierButton 
              label={<Regex className="h-3.5 w-3.5" />} 
              active={state.editorSearchRegex} 
              onClick={() => globalState.setState({ editorSearchRegex: !state.editorSearchRegex })}
              tooltip="Use Regular Expression"
            />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-1 md:px-2 text-[10px] text-muted-foreground whitespace-nowrap min-w-fit md:min-w-[70px] justify-center">
            {state.editorSearchResultsCount > 0 ? (
                <>
                  <span className="md:inline hidden">{state.editorSearchCurrentIndex + 1} of {state.editorSearchResultsCount}</span>
                  <span className="md:hidden inline">{state.editorSearchCurrentIndex + 1}/{state.editorSearchResultsCount}</span>
                </>
            ) : (
                <span className="opacity-50 italic">No results</span>
            )}
        </div>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted" onClick={onFindPrev} title="Previous Match (Shift+Enter)">
            <ChevronUpIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted" onClick={onFindNext} title="Next Match (Enter)">
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 ml-auto hover:bg-destructive/10 hover:text-destructive transition-colors" 
          onClick={handleClose}
          title="Close (Escape)"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Row 2: Replace */}
      {state.isEditorReplaceOpen && (
        <div className="flex items-center gap-1 animate-in fade-in duration-200">
          <div className="w-6 shrink-0" /> {/* Aligner */}
          
          <div className="relative flex-[2] min-w-0 md:max-w-[300px] group">
            <Input 
              ref={replaceInputRef}
              value={state.editorReplaceQuery}
              onChange={(e) => globalState.setState({ editorReplaceQuery: e.target.value })}
              onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                      e.preventDefault();
                      if (e.ctrlKey || e.metaKey || e.altKey) {
                          onReplaceAll();
                      } else {
                          onReplace();
                      }
                  }
              }}
              placeholder="Replace"
              className="h-7 w-full border-border/50 bg-background/50 pl-2 pr-10 text-xs focus-visible:ring-1 focus-visible:ring-primary shadow-none rounded-sm"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-focus-within:opacity-100 transition-opacity">
              <SearchModifierButton 
                label={<span className="font-mono text-[9px] font-bold leading-none">AB</span>} 
                active={state.editorReplacePreserveCase} 
                onClick={() => globalState.setState({ editorReplacePreserveCase: !state.editorReplacePreserveCase })}
                tooltip="Preserve Case"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 hover:bg-muted" 
                onClick={onReplace}
                title="Replace (Enter)"
            >
              <ReplaceIcon className="h-4 w-4" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 hover:bg-muted" 
                onClick={onReplaceAll}
                title="Replace All (Ctrl+Alt+Enter)"
            >
              <ReplaceAllIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchModifierButton({ 
  label, 
  active, 
  onClick, 
  tooltip,
  className
}: { 
  label: React.ReactNode, 
  active: boolean, 
  onClick: () => void,
  tooltip: string,
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      data-active={active}
      className={cn(
        "h-5 px-1 flex items-center justify-center rounded-sm text-[10px] font-mono transition-colors",
        active 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {label}
    </button>
  );
}
