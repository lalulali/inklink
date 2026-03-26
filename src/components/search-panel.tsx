/**
 * Feature: Search Panel Component
 * Purpose: Provides real-time search functionality within the mind map
 * Dependencies: shadcn/ui Input, Button, Toggle, Lucide icons
 */

"use client";

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    return globalState.subscribe(s => setState(s));
  }, []);

  /**
   * Keyboard shortcut listener for Ctrl/Cmd+F
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        "absolute right-4 top-4 z-40 flex items-center gap-2 rounded-lg border bg-background p-1.5 shadow-xl transition-all duration-200 animate-in fade-in zoom-in-95",
        isOpen ? "translate-y-0" : "-translate-y-2 opacity-0"
      )}
      id="inklink-search-panel"
    >
      {/* Search Input Area */}
      <div className="flex items-center gap-2 border-r pl-2 pr-2">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <Input 
          autoFocus
          value={state.searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Find in mind map..." 
          className="h-8 w-48 border-none px-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Result Navigation */}
      <div className="flex items-center gap-1 pr-1 text-[10px] font-bold uppercase tracking-tight text-muted-foreground/60 w-12 text-center">
        {state.searchQuery && state.searchResults.length === 0 ? (
          <span className="text-destructive">None</span>
        ) : (
          <>
            <span>{state.searchResults.length > 0 ? state.currentSearchIndex + 1 : 0}</span>
            <span className="opacity-50">/</span>
            <span>{state.searchResults.length}</span>
          </>
        )}
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-0.5 border-l pl-0.5">
        <Toggle 
          variant="outline" 
          size="sm" 
          pressed={caseSensitive}
          onPressedChange={setCaseSensitive}
          className="h-7 w-7 p-0 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          aria-label="Match Case"
        >
          <CaseSensitiveIcon className="h-4 w-4" />
        </Toggle>
        
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateSearch('prev')}>
          <ChevronUpIcon className="h-4 w-4" />
        </Button>
        
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateSearch('next')}>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setIsOpen(false)}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
