import React, { useEffect } from 'react';
import { 
  FileTextIcon, 
  MapIcon, 
  ZoomInIcon, 
  CheckCircle2Icon, 
  CircleIcon, 
  Loader2Icon 
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

      {/* Mind Map Metrics */}
      <div className="flex items-center gap-1.5 border-r pr-3">
        <MapIcon className="h-3 w-3" />
        <span>{totalNodes} Nodes</span>
      </div>

      {/* Viewport Info */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-1.5">
          <ZoomInIcon className="h-3 w-3" />
          <span>{Math.round((state.transform?.scale || 1) * 100)}%</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <span>{state.layoutDirection === 'two-sided' ? 'Balanced' : 'Linear'} View</span>
        </div>
      </div>
    </div>
  );
}
