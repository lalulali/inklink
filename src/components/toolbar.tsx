/**
 * Feature: Toolbar Component
 * Purpose: Provides access to primary user actions (file, layout, view)
 * Dependencies: shadcn/ui components, lucide-react icons
 */

"use client";

import React from 'react';
import { useWebPlatform } from "@/platform/web/web-platform-context";
import { useNotification } from "@/platform/web/web-notification-manager";
import { globalState } from '@/core/state/state-manager';
import { Button } from "@/components/ui/button";
import { 
  FolderOpen as FolderOpenIcon, 
  Save as SaveIcon, 
  Download as DownloadIcon, 
  Maximize as MaximizeIcon, 
  Minimize as MinimizeIcon,
  RefreshCcw as RefreshCcwIcon,
  Search as SearchIcon,
  HelpCircle as HelpCircleIcon,
  LayoutGrid as LayoutGridIcon,
  FileText as FileTextIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Maximize2 as Maximize2Icon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";
 
/**
 * Mind Map Layout Icons
 */
const LTRLayoutIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="6" cy="12" r="2" />
    <path d="M8 12h10" />
    <path d="M12 12c0-3.5 1.5-6 6-6" />
    <path d="M12 12c0 3.5 1.5 6 6 6" />
  </svg>
);

const RTLLayoutIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="18" cy="12" r="2" />
    <path d="M16 12H6" />
    <path d="M12 12c0-3.5-1.5-6-6-6" />
    <path d="M12 12c0 3.5-1.5 6-6 6" />
  </svg>
);

const TwoSidedLayoutIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="2" />
    <path d="M14 12h8" />
    <path d="M16 12c0-3.5 1.5-6 6-6" />
    <path d="M16 12c0 3.5 1.5 6 6 6" />
    <path d="M10 12H2" />
    <path d="M8 12c0-3.5-1.5-6-6-6" />
    <path d="M8 12c0 3.5-1.5 6-6 6" />
  </svg>
);


/**
 * Main application toolbar
 */
export function Toolbar({ 
  onToggleEditor, 
  editorVisible 
}: { 
  onToggleEditor: () => void; 
  editorVisible: boolean; 
}) {
  const { export: exportMgr, factory } = useWebPlatform();
  const { showSuccess, showError, showInfo } = useNotification();
  const [state, setState] = React.useState(globalState.getState());

  React.useEffect(() => {
    return globalState.subscribe(s => setState(s));
  }, []);

  const handleExport = async (format: 'html' | 'svg' | 'png' | 'jpg') => {
    try {
      showInfo(`Starting ${format.toUpperCase()} export...`);
      const svg = document.querySelector('svg');
      if (!svg) throw new Error('SVG not found');

      if (format === 'html') {
        const content = exportMgr.exportToHTML(svg.outerHTML, 'Mind Map');
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindmap-${Date.now()}.html`;
        a.click();
      } else if (format === 'png') {
        const blob = await exportMgr.exportToPNG(svg as SVGSVGElement, 'white');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindmap-${Date.now()}.png`;
        a.click();
      }
      
      showSuccess('Export successful', `Mind map exported as ${format.toUpperCase()}`);
    } catch (err) {
      showError('Export failed', (err as Error).message);
    }
  };

  const handleToggleEditor = () => {
    onToggleEditor();
    // Blur active elements to ensure focus resets properly after UI shift
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleLayoutChange = (val: string) => {
    globalState.setState({ layoutDirection: val as any });
    // Remove focus from the selector trigger after a value is chosen
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  /**
   * Toggles visibility for all nodes in the tree
   */
  const handleToggleAllVisibility = (collapsed: boolean) => {
    const s = globalState.getState();
    if (!s.tree) return;
    
    // Helper to recursively update collapse state
    const recursiveSet = (node: any) => {
      node.collapsed = collapsed;
      if (node.children) {
        node.children.forEach(recursiveSet);
      }
    };
    
    // Shallow clone of root to satisfy the state manager's reference change requirement
    const newTree = { ...s.tree };
    recursiveSet(newTree);
    
    globalState.setState({ tree: newTree, isDirty: true });
    showSuccess(`${collapsed ? 'Collapsed' : 'Expanded'} all nodes`);
  };

  /**
   * Handle Canvas-specific keyboard shortcuts
   */
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      
      // Safety guard: skip if typing in input or editor
      const isTyping = active?.tagName === 'INPUT' || 
                       active?.tagName === 'TEXTAREA' || 
                       (active as HTMLElement | null)?.isContentEditable || 
                       active?.closest('.cm-editor');
      if (isTyping) return;

      // Rule: shortcuts E and C are only for canvas focus
      const canvas = document.getElementById('inklink-mindmap-canvas');
      const isCanvasFocused = active === canvas || canvas?.contains(active);
      if (!isCanvasFocused) return;

      const key = e.key.toLowerCase();
      if (key === 'e') {
        e.preventDefault();
        handleToggleAllVisibility(false);
      } else if (key === 'c') {
        e.preventDefault();
        handleToggleAllVisibility(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Static registration

  /**
   * Dispatches find events to the appropriate component based on focus
   */
  const handleFind = () => {
    const active = document.activeElement;
    const isInEditor = active?.closest('.cm-editor');
    
    if (isInEditor) {
      window.dispatchEvent(new CustomEvent('inklink-editor-search'));
    } else {
      window.dispatchEvent(new CustomEvent('inklink-toggle-search'));
    }
  };

  return (
    <div className="flex h-12 w-full items-center gap-2 border-b bg-background px-4 shadow-sm overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap" id="inklink-toolbar">
      <TooltipProvider delayDuration={300}>
        {/* File Operations */}
        <div className="flex shrink-0 items-center gap-1 border-r pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={editorVisible ? "secondary" : "ghost"} 
                size="icon" 
                className="h-8 w-8" 
                onClick={onToggleEditor}
              >
                <FileTextIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{editorVisible ? "Hide Editor" : "Show Editor"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => showInfo('Opening file browser...')}>
                <FolderOpenIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open File (Cmd+O)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => {
                  globalState.setState({ isDirty: false, lastSaved: new Date() });
                  showSuccess('Manually saved');
                }}
              >
                <SaveIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save (Cmd+S)</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0">
                <DownloadIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem className="text-sm" onClick={() => handleExport('html')}>Export as HTML</DropdownMenuItem>
              <DropdownMenuItem className="text-sm" onClick={() => handleExport('svg')}>Export as SVG</DropdownMenuItem>
              <DropdownMenuItem className="text-sm" onClick={() => handleExport('png')}>Export as PNG</DropdownMenuItem>
              <DropdownMenuItem className="text-sm" onClick={() => handleExport('jpg')}>Export as JPG</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tools & Search */}
        <div className="flex shrink-0 items-center gap-1 border-r pr-2 px-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFind();
                }}
              >
                <SearchIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Find (Cmd+F)</TooltipContent>
          </Tooltip>
        </div>

        {/* Layout Selector */}
        <div className="flex shrink-0 items-center gap-1 border-r pr-2 px-1">
          <div className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1 lg:flex px-1">
            <LayoutGridIcon className="h-3.5 w-3.5" />
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={state.layoutDirection === 'two-sided' ? "secondary" : "ghost"} 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => handleLayoutChange('two-sided')}
              >
                <TwoSidedLayoutIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Two-Sided Layout</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={state.layoutDirection === 'left-to-right' ? "secondary" : "ghost"} 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => handleLayoutChange('left-to-right')}
              >
                <LTRLayoutIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Left to Right Layout</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={state.layoutDirection === 'right-to-left' ? "secondary" : "ghost"} 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => handleLayoutChange('right-to-left')}
              >
                <RTLLayoutIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Right to Left Layout</TooltipContent>
          </Tooltip>
        </div>

        {/* Visibility Controls */}
        <div className="flex shrink-0 items-center gap-1 pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => handleToggleAllVisibility(false)}
              >
                <MaximizeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expand All (E)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => handleToggleAllVisibility(true)}
              >
                <MinimizeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Collapse All (C)</TooltipContent>
          </Tooltip>
        </div>

        {/* Help / Theme / Status */}
        <div className="ml-auto flex shrink-0 items-center gap-2 pr-2">
          <div className="hidden items-center gap-2 px-3 text-[10px] sm:flex">
             <span className={cn(
               "h-2 w-2 rounded-full",
               state.isDirty ? "bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]" : "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]"
             )}></span>
             <span className="font-medium text-muted-foreground uppercase opacity-70">
               {state.isDirty ? 'Unsaved' : 'Saved'}
             </span>
          </div>

          <ModeToggle />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircleIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>App Reference (?)</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
