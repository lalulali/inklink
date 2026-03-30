/**
 * Feature: App Reference Dialog
 * Purpose: Provides a visual guide for all keyboard shortcuts and application controls
 * Dependencies: shadcn/ui Dialog, globalState
 */

"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { globalState } from '@/core/state/state-manager';
import { Command, Keyboard } from 'lucide-react';

export function AppReferenceDialog() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    return globalState.subscribe(s => {
      if (s.isHelpDialogOpen !== isOpen) {
        setIsOpen(!!s.isHelpDialogOpen);
      }
    });
  }, [isOpen]);

  const close = () => globalState.setState({ isHelpDialogOpen: false });

  const ShortcutGroup = ({ title, shortcuts }: { title: string, shortcuts: { key: string, label: string }[] }) => (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {shortcuts.map((s, i) => (
          <div key={i} className="flex items-center justify-between group">
            <span className="text-xs text-foreground/80 group-hover:text-foreground transition-colors">{s.label}</span>
            <div className="flex items-center gap-1">
              {s.key.split('+').map((k, j) => (
                <kbd key={j} className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded border bg-muted font-mono text-[10px] font-medium shadow-sm">
                  {k === 'Cmd' ? (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') : k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={isOpen => globalState.setState({ isHelpDialogOpen: isOpen })}>
      <DialogContent className="max-w-lg overflow-hidden border-border/40 sm:rounded-2xl shadow-2xl backdrop-blur-xl bg-background/95">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Keyboard className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold tracking-tight">Keyboard Reference</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Boost your productivity with professional-grade keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-4 -mr-4 no-scrollbar scroll-smooth">
          <div className="space-y-2">
            <ShortcutGroup 
              title="Canvas Interactions" 
              shortcuts={[
                { key: 'E', label: 'Show/Hide Markdown Editor' },
                { key: 'X', label: 'Expand Branch / Expand All' },
                { key: 'C', label: 'Collapse Branch / Collapse All' },
                { key: 'Enter', label: 'Toggle Selected Node' },
                { key: 'F', label: 'Fit Map to Screen' },
                { key: 'R', label: 'Reset Zoom to 100%' },
                { key: 'Esc', label: 'Deselect Node / Close Panel' },
              ]}
            />

            <ShortcutGroup 
              title="File & System" 
              shortcuts={[
                { key: 'Cmd+S', label: 'Save Changes' },
                { key: 'Cmd+O', label: 'Open Markdown File' },
                { key: 'Cmd+E', label: 'Export to HTML/PNG' },
                { key: 'Shift+/', label: 'Show this Help Reference' },
              ]}
            />

            <ShortcutGroup 
              title="Layout & View" 
              shortcuts={[
                { key: 'Cmd+←', label: 'Switch to Right-To-Left layout' },
                { key: 'Cmd+→', label: 'Switch to Left-To-Right layout' },
                { key: 'Cmd+↕', label: 'Switch to Two-Sided layout' },
              ]}
            />

            <ShortcutGroup 
              title="Search & Replace" 
              shortcuts={[
                { key: 'Cmd+F', label: 'Search Mind Map Nodes' },
                { key: 'Cmd+Shift+F', label: 'Search in Editor' },
                { key: 'Cmd+Shift+H', label: 'Replace in Editor' },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Command className="h-4 w-4" />
             </div>
             <div>
                <p className="text-xs font-bold text-primary">Pro Tip</p>
                <p className="text-[10px] text-muted-foreground font-medium">Double-click any node to reveal it in the Markdown editor.</p>
             </div>
          </div>
          <button 
            onClick={close}
            className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-muted"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
