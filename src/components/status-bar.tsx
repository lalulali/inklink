import React, { useEffect } from 'react';
import { 
  FileText as FileTextIcon, 
  Map as MapIcon, 
  ZoomIn as ZoomInIcon, 
  ZoomOut as ZoomOutIcon,
  Maximize2 as MaximizeIcon,
  RefreshCcw as RefreshCcwIcon,
  CheckCircle2 as CheckCircle2Icon, 
  Circle as CircleIcon, 
  Loader2 as Loader2Icon 
} from 'lucide-react';
import { globalState } from '@/core/state/state-manager';
import { calculateSubtreeSizes } from '@/core/layout/subtree-utils';

/**
 * Bottom status bar for global application state
 */
export function StatusBar() {
  const [state, setState] = React.useState(globalState.getState());

  useEffect(() => {
    return globalState.subscribe(s => setState(s));
  }, []);

  const totalNodes = state.tree ? calculateSubtreeSizes(state.tree).size : 0;
  
  // Status logic
  const isSaving = state.loading;
  const isDirty = state.isDirty;

  return (
    <div 
      className="flex h-7 w-full items-center gap-2 border-t bg-muted/30 px-3 text-[10px] font-medium text-muted-foreground select-none overflow-hidden whitespace-nowrap"
      id="inklink-status-bar"
    >
      {/* File Info */}
      <div className="flex items-center gap-1.5 border-r pr-3">
        <FileTextIcon className="h-3 w-3" />
        <span className="truncate max-w-[200px]">{state.filePath || 'untitled.md'}</span>
      </div>

      {/* Mind Map Metrics — hidden on mobile */}
      <div className="hidden md:flex items-center gap-1.5 border-r pr-3">
        <MapIcon className="h-3 w-3" />
        <span>{totalNodes} Nodes</span>
      </div>

      {/* Save Status - Reactive to State changes */}
      <div className="flex items-center gap-1.5 border-r pr-3">
        {isSaving ? (
          <>
            <Loader2Icon className="h-3 w-3 animate-spin text-blue-500" />
            <span className="uppercase tracking-wider opacity-70">Auto-saving...</span>
          </>
        ) : isDirty ? (
          <>
            <CircleIcon className="h-3 w-3 text-amber-500 fill-amber-500/20" />
            <span className="uppercase tracking-wider text-amber-600 font-bold">Unsaved Changes</span>
          </>
        ) : (
          <>
            <CheckCircle2Icon className="h-3 w-3 text-green-500" />
            <span className="uppercase tracking-wider opacity-70">Saved to local</span>
          </>
        )}
      </div>

      {/* Viewport Info & Controls — hidden on mobile */}
      <div className="hidden md:flex items-center gap-4 ml-auto">
        <div className="flex items-center gap-2 border-r pr-3 h-4">
          <button 
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('inklink-fit-view'))}
            className="hover:text-foreground transition-colors p-0.5 rounded"
            title="Fit to Screen"
          >
            <MaximizeIcon className="h-3 w-3" />
          </button>
          
          <div className="flex items-center gap-2 border-l pl-3 ml-1">
            <ZoomOutIcon className="h-2.5 w-2.5 opacity-50" />
            <input 
              type="range"
              min="0.1"
              max="3"
              step="0.05"
              value={state.transform.scale}
              onChange={(e) => {
                const newScale = parseFloat(e.target.value);
                globalState.setState({
                  transform: { ...state.transform, scale: newScale }
                });
              }}
              className="w-16 accent-blue-500 h-1 bg-muted-foreground/20 rounded-full appearance-none cursor-pointer hover:bg-muted-foreground/40 transition-all"
            />
            <ZoomInIcon className="h-2.5 w-2.5 opacity-50" />
            
            <button 
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('inklink-reset-view'))}
              className="hover:text-foreground transition-colors p-0.5 rounded ml-1"
              title="Reset to 100%"
            >
              <RefreshCcwIcon className="h-3 w-3" />
            </button>
          </div>

          <span className="min-w-[40px] text-right font-bold text-foreground/80">
            {Math.round((state.transform?.scale || 1) * 100)}%
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 opacity-60">
          <span>{state.layoutDirection === 'two-sided' ? 'Balanced' : 'Linear'} View</span>
        </div>
      </div>
    </div>
  );
}
