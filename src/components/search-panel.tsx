/**
 * Feature: Search Panel Component
 * Purpose: Provides real-time search functionality within the mind map
 * Dependencies: shadcn/ui Input, Button, Toggle, Lucide icons
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { 
  SearchIcon, 
  XIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  CaseSensitiveIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

import { globalState } from '@/core/state/state-manager';

/**
 * Search panel for finding and navigating node content
 */
export function SearchPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState(globalState.getState());
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return globalState.subscribe(s => setState(s));
  }, []);

  /**
   * Keyboard shortcut listener for Ctrl/Cmd+F
   */
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener('inklink-toggle-search', handleToggle);

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      
      // If we are in the editor, let CodeMirror handle its own search
      const isInEditor = active?.closest('.cm-editor');

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        if (isInEditor) return;
        
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('inklink-toggle-search', handleToggle);
    };
  }, []);

  const handleSearch = (q: string) => {
    if (!state.tree) return;
    
    // Find all matching nodes
    const results: string[] = [];
    const traverse = (node: any) => {
      const match = caseSensitive 
        ? node.content.includes(q)
        : node.content.toLowerCase().includes(q.toLowerCase());
      
      if (q && match) results.push(node.id);
      if (node.children) node.children.forEach(traverse);
    };
    traverse(state.tree);

    globalState.setState({
      searchQuery: q,
      searchResults: results,
      currentSearchIndex: results.length > 0 ? 0 : -1
    });
  };

  const navigateSearch = (dir: 'next' | 'prev') => {
    const count = state.searchResults.length;
    if (count === 0) return;

    let next = state.currentSearchIndex + (dir === 'next' ? 1 : -1);
    if (next >= count) next = 0;
    if (next < 0) next = count - 1;

    globalState.setState({ currentSearchIndex: next });
    
    // We'd ideally call renderer.focusNode(state.searchResults[next])
  };

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "absolute right-6 top-6 z-40 flex items-center gap-3 rounded-full border bg-background/80 p-3 backdrop-blur-md shadow-2xl transition-all duration-300 animate-in slide-in-from-top-2 fade-in",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
      )}
      id="inklink-search-panel"
    >
      {/* Search Input Area */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SearchIcon className="h-5 w-5" />
        </div>
        <Input 
          ref={inputRef}
          autoFocus
          value={state.searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              navigateSearch(e.shiftKey ? 'prev' : 'next');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              navigateSearch('next');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              navigateSearch('prev');
            }
          }}
          placeholder="Find in map..." 
          className="h-8 w-44 border-none bg-transparent px-0 text-base font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 shadow-none"
        />
      </div>

      {/* Result Status Indicator */}
      <div className="flex items-center justify-center w-24 rounded-md bg-muted/30 px-2 py-1 text-xs font-bold tracking-widest text-muted-foreground transition-all duration-300">
        {state.searchQuery && state.searchResults.length === 0 ? (
          <span className="text-destructive/80 animate-pulse">NO MATCH</span>
        ) : (
          <div className="flex items-center gap-1.5 pt-[1px]">
            <span className="text-primary font-black">{state.searchResults.length > 0 ? state.currentSearchIndex + 1 : 0}</span>
            <span className="opacity-30">OF</span>
            <span className="text-primary font-black">{state.searchResults.length}</span>
          </div>
        )}
      </div>

      {/* Controls & Actions */}
      <div className="flex items-center gap-1 ml-1 border-l pl-2 border-muted-foreground/10">
        <Toggle 
          variant="outline" 
          size="sm" 
          pressed={caseSensitive}
          onPressedChange={setCaseSensitive}
          className="h-9 w-9 rounded-full border-none data-[state=on]:bg-primary/20 data-[state=on]:text-primary hover:bg-muted"
          aria-label="Match Case"
        >
          <CaseSensitiveIcon className="h-5 w-5" />
        </Toggle>
        
        <div className="flex items-center gap-0.5 ml-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full hover:bg-muted" 
            onClick={() => navigateSearch('prev')}
            disabled={state.searchResults.length <= 1}
          >
            <ChevronUpIcon className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full hover:bg-muted" 
            onClick={() => navigateSearch('next')}
            disabled={state.searchResults.length <= 1}
          >
            <ChevronDownIcon className="h-5 w-5" />
          </Button>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="ml-1 h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <XIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
