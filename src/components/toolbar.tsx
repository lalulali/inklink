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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";

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

  const handleLayoutChange = (val: string) => {
    globalState.setState({ layoutDirection: val as any });
  };

  return (
    <div className="flex h-12 w-full items-center gap-2 border-b bg-background px-4 shadow-sm overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap" id="inklink-toolbar">
      <TooltipProvider delayDuration={300}>
        {/* File Operations */}
        <div className="flex shrink-0 items-center gap-1 border-r pr-2">
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
        </div>

        {/* Layout Selector */}
        <div className="flex shrink-0 items-center gap-2 border-r pr-2 px-1">
          <div className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground lg:flex">
            <LayoutGridIcon className="h-3.5 w-3.5" />
            <span>Layout:</span>
          </div>
          <Select value={state.layoutDirection} onValueChange={handleLayoutChange}>
            <SelectTrigger className="h-8 w-[120px] lg:w-[140px] text-xs">
              <SelectValue placeholder="Select layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="two-sided">Two-Sided</SelectItem>
              <SelectItem value="left-to-right">Left to Right</SelectItem>
              <SelectItem value="right-to-left">Right to Left</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Visibility Controls */}
        <div className="flex shrink-0 items-center gap-1 border-r pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MaximizeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expand All (E)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MinimizeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Collapse All (C)</TooltipContent>
          </Tooltip>
        </div>

        {/* Tools & Search */}
        <div className="flex shrink-0 items-center gap-1 border-r pr-2 px-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <SearchIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Find (Cmd+F)</TooltipContent>
          </Tooltip>
        </div>

        {/* Export Manager */}
        <div className="shrink-0 px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <DownloadIcon className="h-3.5 w-3.5" />
                <span>Export</span>
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
