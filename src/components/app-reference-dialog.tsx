/**
 * Feature: App Reference Dialog
 * Purpose: Provides a visual guide for all keyboard shortcuts and application controls
 * Dependencies: shadcn/ui Dialog, globalState
 */

"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { globalState } from '@/core/state/state-manager';
import { Command, Keyboard, X as XIcon } from 'lucide-react';
import { PlatformFactory, PlatformType } from '@/platform';
import { getModKey } from '@/lib/utils';

export function AppReferenceDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [modKey, setModKey] = React.useState('Ctrl');

  React.useEffect(() => {
    setModKey(getModKey());
    return globalState.subscribe(s => {
      if (s.isHelpDialogOpen !== isOpen) {
        setIsOpen(!!s.isHelpDialogOpen);
      }
    });
  }, [isOpen]);

  const close = () => globalState.setState({ isHelpDialogOpen: false });

  const ShortcutGroup = ({ title, shortcuts, isFirst = false }: { title: string, shortcuts: { key: string, label: string }[], isFirst?: boolean }) => (
    <div className={`py-3 sm:py-4 ${!isFirst ? 'border-t border-border/40' : ''}`}>
      <h3 className="mb-2 sm:mb-3 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-primary/80">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
        {shortcuts.map((s) => (
          <div key={`${title}-${s.label}`} className="flex items-center justify-between group py-0.5">
            <span className="text-[11px] sm:text-xs text-muted-foreground group-hover:text-foreground transition-all duration-200 font-medium">{s.label}</span>
            <div className="flex items-center gap-1 sm:gap-1.5 translate-y-[1px]">
              {s.key.split('+').map((k, j) => (
                <kbd key={`${title}-${s.label}-${k}-${j}`} className="min-w-[22px] sm:min-w-[26px] h-5 sm:h-6 px-1.5 sm:px-2 flex items-center justify-center rounded-md sm:rounded-lg border border-border/60 bg-muted/30 font-mono text-[8px] sm:text-[9px] font-black shadow-[0_1px_1px_rgba(0,0,0,0.1)] group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-200">
                  {k === 'Cmd' ? (modKey === 'Cmd' ? '⌘' : 'Ctrl') : k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={isOpen => globalState.setState({ isHelpDialogOpen: isOpen })}>
      <SheetContent 
        id="app-reference-root"
        side="right" 
        className="w-[400px] sm:w-[540px] sm:max-w-md p-0 bg-background flex flex-col border-l border-border transition-all duration-300"
        style={{ top: '56px', height: 'calc(100dvh - 56px)' }}
      >
        <style jsx global>{`
          #app-reference-root .sleek-scrollbar::-webkit-scrollbar {
            width: 12px !important;
            height: 12px !important;
          }
          #app-reference-root .sleek-scrollbar::-webkit-scrollbar-track {
            background-color: transparent !important;
          }
          #app-reference-root .sleek-scrollbar::-webkit-scrollbar-thumb {
            background-color: hsl(var(--muted-foreground) / 0.05) !important;
            border-radius: 10px !important;
            border: 4px solid transparent !important;
            background-clip: content-box !important;
            cursor: pointer !important;
          }
          #app-reference-root:hover .sleek-scrollbar::-webkit-scrollbar-thumb {
            background-color: hsl(var(--muted-foreground) / 0.25) !important;
            border-width: 2.5px !important;
          }
          #app-reference-root .sleek-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: hsl(var(--muted-foreground) / 0.45) !important;
            border-width: 1.5px !important;
          }
        `}</style>
        <SheetHeader className="p-4 sm:p-6 border-b border-border/50 bg-background sticky top-0 z-10 flex flex-row items-start justify-between space-y-0">
          <div className="flex flex-col gap-1 sm:gap-1.5 flex-1 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold tracking-tight">
              <Keyboard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Keyboard Shortcuts
            </SheetTitle>
            <SheetDescription className="text-[11px] sm:text-sm text-muted-foreground text-left leading-relaxed">
              Boost your productivity with professional-grade keyboard shortcuts.
            </SheetDescription>
          </div>
          <button 
            type="button"
            onClick={close}
            className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full hover:bg-muted transition-all duration-200 -mt-1 -mr-1 sm:-mr-2"
          >
            <XIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground hover:text-foreground transition-colors" />
            <span className="sr-only">Close</span>
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 sleek-scrollbar scroll-smooth">
          <div className="space-y-0">
            {(() => {
                const factory = PlatformFactory.getInstance();
                const isVsCode = factory.getPlatform() === PlatformType.VSCode;

                return (
                    <>
                        <ShortcutGroup 
                            title="Canvas Interactions" 
                            isFirst={true}
                            shortcuts={[
                                { key: 'E', label: isVsCode ? 'Focus Source in Editor' : 'Show/Hide Markdown Editor' },
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
                                { key: 'Cmd+S', label: 'Refresh Visualization' },
                                { key: 'Cmd+O', label: 'Open Markdown File' },
                                { key: 'Cmd+E', label: 'Export to HTML/PNG' },
                                { key: 'Shift+/', label: 'Show this Help Reference' },
                            ].filter(s => {
                                if (!isVsCode) return true;
                                // Remove these for VS Code help
                                return s.key !== 'Cmd+S' && s.key !== 'Cmd+O';
                            })}
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
                            ].filter(s => {
                                if (!isVsCode) return true;
                                // Remove search/replace in editor as VS Code handles it
                                return s.key !== 'Cmd+Shift+F' && s.key !== 'Cmd+Shift+H';
                            })}
                        />
                    </>
                );
            })()}
          </div>
        </div>

        <div className="m-4 sm:m-6 shrink-0 flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/[0.08] transition-all group/tip">
          <div className="flex items-center gap-3 sm:gap-4">
             <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover/tip:scale-110 transition-transform">
                <Command className="h-4 w-4 sm:h-5 sm:w-5" />
             </div>
             <div className="flex flex-col gap-0.5">
                <p className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-[0.2em]">Mind Map Tip</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium leading-tight">Double-click any node to reveal its location in source.</p>
             </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
