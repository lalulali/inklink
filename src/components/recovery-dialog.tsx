/**
 * Feature: Recovery Dialog
 * Purpose: Allows user to restore auto-saved sessions after a crash or refresh
 * Dependencies: shadcn/ui Dialog, globalState, WebStorageAdapter
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
import { Button } from "@/components/ui/button";
import { globalState } from '@/core/state/state-manager';
import { History as HistoryIcon, Trash2, FileText, RefreshCw } from 'lucide-react';
import { WebStorageAdapter } from '@/platform/web/web-storage-adapter';
import type { AutoSaveRecord } from '@/core/types';
import { createMarkdownParser } from '@/core/parser/markdown-parser';
import { ColorManager } from '@/core/theme/color-manager';

export function RecoveryDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [allRecords, setAllRecords] = React.useState<AutoSaveRecord[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const storage = React.useMemo(() => new WebStorageAdapter(), []);

  // Sync with global state for trigger
  React.useEffect(() => {
    const unsub = globalState.subscribe(s => {
      setIsOpen(!!s.isRecoveryDialogOpen);
    });
    return unsub;
  }, []);

  // Load all records when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      const fetchRecords = async () => {
        const records = await storage.listAutoSaves();
        // Sort by timestamp descending
        const sorted = records.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setAllRecords(sorted);
        if (sorted.length > 0 && !selectedId) {
          setSelectedId(sorted[0].id || 'current');
        }
      };
      fetchRecords();
    }
  }, [isOpen, storage, selectedId]);

  const selectedRecord = React.useMemo(() => {
    return allRecords.find(r => (r.id || 'current') === selectedId) || null;
  }, [allRecords, selectedId]);

  const handleRestore = () => {
    if (selectedRecord) {
      const parser = createMarkdownParser();
      const tree = parser.parse(selectedRecord.markdown);
      ColorManager.assignBranchColors(tree);

      globalState.setState({ 
          markdown: selectedRecord.markdown,
          tree,
          autoSaveId: selectedRecord.id || null,
          filePath: selectedRecord.filePath,
          currentFile: selectedRecord.fileHandle ? {
            handle: selectedRecord.fileHandle,
            path: selectedRecord.filePath || 'mindmap.md',
            name: selectedRecord.filePath || 'mindmap.md'
          } : null,
          isRecoveryDialogOpen: false,
          recoveryRecord: null,
          lastSaved: selectedRecord.timestamp,
          lastSaveType: 'auto',
          isDirty: false,
          notification: { type: 'success', message: 'Session restored successfully' }
      });
    }
  };

  const handleDiscard = async () => {
    if (selectedId) {
      await storage.clearAutoSave(selectedId);
      const updated = allRecords.filter(r => (r.id || 'current') !== selectedId);
      setAllRecords(updated);
      if (updated.length > 0) {
        setSelectedId(updated[0].id || 'current');
      } else {
        setSelectedId(null);
        globalState.setState({ isRecoveryDialogOpen: false, recoveryRecord: null });
      }
    }
  };

  const handleCleanAll = async () => {
    try {
        setIsClearing(true);
        await storage.clearAllAutoSaves();
        setAllRecords([]);
        setSelectedId(null);
        globalState.setState({ isRecoveryDialogOpen: false, recoveryRecord: null });
        setIsConfirmingClear(false);
    } catch {
        // Silently fail
    } finally {
        setIsClearing(false);
    }
  };

  if (allRecords.length === 0 && !isOpen) return null;

  const latestRecord = allRecords[0];
  const otherRecords = allRecords.slice(1);

  return (
    <Dialog open={isOpen} onOpenChange={open => globalState.setState({ isRecoveryDialogOpen: open })}>
      <DialogContent className="sm:max-w-2xl border-border sm:rounded-2xl shadow-2xl bg-background overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-2 text-primary mb-1">
            <HistoryIcon className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold tracking-tight">Recovery Center</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            We discovered sessions from your local storage. Pick one to carry on.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-6 py-2 overflow-hidden flex-1 mini-scrollbar">
          {/* List of sessions */}
          <div className="flex-1 flex flex-col overflow-hidden pr-2">
            
            {/* PINNED: Latest Activity */}
            {latestRecord && (
              <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
                <div className="text-[10px] uppercase font-black tracking-widest text-primary/70 mb-3 px-1 ml-1 flex items-center gap-2">
                   <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                   Latest Activity
                </div>
                {(() => {
                    const id = latestRecord.id || 'current';
                    const isSelected = selectedId === id;
                    const date = new Date(latestRecord.timestamp);
                    const label = latestRecord.filePath ? latestRecord.filePath.split('/').pop() : 'Unsaved Mind Map';
                    
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedId(id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                          isSelected 
                            ? 'bg-primary/10 border-primary shadow-lg ring-1 ring-primary/20 scale-[1.02]' 
                            : 'bg-muted border-border hover:border-primary/30 hover:bg-muted/60'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                        )}
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl transition-all duration-500 ${isSelected ? 'bg-primary text-white rotate-12 shadow-lg shadow-primary/30' : 'bg-background text-muted-foreground group-hover:text-primary/70'}`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className={`text-sm font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                {label}
                              </p>
                              <span className="text-[10px] font-bold text-muted-foreground/60 whitespace-nowrap bg-muted/50 px-1.5 py-0.5 rounded-md">
                                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground/80 truncate font-medium mt-1">
                               Snapshot from {date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                })()}
              </div>
            )}

            {/* SEPARATOR */}
            {otherRecords.length > 0 && (
                <div className="relative mb-5 px-1">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-border/40"></div>
                    </div>
                    <div className="relative flex justify-start">
                        <span className="bg-background pr-3 text-[9px] uppercase font-black tracking-widest text-muted-foreground/45">Named Snapshots</span>
                    </div>
                </div>
            )}

            {/* SCROLLABLE: Named Snapshots */}
            <div className="flex-1 overflow-y-auto space-y-2 mini-scrollbar pr-1 -mr-1">
              {otherRecords.map((r) => {
                const id = r.id || 'current';
                const isSelected = selectedId === id;
                const date = new Date(r.timestamp);
                const label = r.filePath ? r.filePath.split('/').pop() : 'Unsaved Mind Map';

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group relative overflow-hidden ${
                      isSelected 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-muted/20 border-border/40 hover:border-primary/20 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md transition-colors ${isSelected ? 'bg-primary/20 text-primary' : 'bg-background/80 text-muted-foreground group-hover:text-primary/70'}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-2">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {label}
                          </p>
                          <span className="text-[9px] font-medium text-muted-foreground/60 tabular-nums">
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selection details */}
          <div className="w-full sm:w-64 flex flex-col gap-4 border-l border-border/30 pl-0 sm:pl-6 pt-6 sm:pt-4">
            <div className="space-y-4 flex-1">
               <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mb-1 px-1">Selected Details</p>
               {selectedRecord ? (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner">
                        <div className="text-[10px] text-primary/60 font-medium mb-1 uppercase tracking-wider">Storage ID</div>
                        <div className="text-xs font-mono font-bold text-primary truncate">
                          {selectedId}
                        </div>
                    </div>
                    
                    <div className="space-y-1.5 px-1">
                        <div className="text-[10px] text-muted-foreground/70 font-bold uppercase">Estimated Size</div>
                        <div className="text-sm font-medium">{(selectedRecord.markdown.length / 1024).toFixed(1)} KB</div>
                    </div>

                    <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-[10px] text-yellow-700/80 dark:text-yellow-400/80 leading-relaxed font-italic">
                      Note: Restoring will overwrite current unsaved changes.
                    </div>
                 </div>
               ) : (
                 <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/40 italic text-xs">
                   Select a record to view details
                 </div>
               )}
            </div>

            <Button 
              size="lg" 
              className="w-full font-black uppercase tracking-widest shadow-xl shadow-primary/20 h-12 text-xs group"
              onClick={handleRestore}
              disabled={!selectedRecord}
            >
              <RefreshCw className="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
              Restore Session
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-border/50">
          {!isConfirmingClear ? (
              <div className="flex justify-between items-center px-1">
                  <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-bold uppercase tracking-wider h-9 text-muted-foreground hover:text-foreground"
                      onClick={handleDiscard}
                      disabled={!selectedId}
                  >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Discard Selection
                  </Button>
                  <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-bold uppercase tracking-wider h-9 text-destructive hover:bg-destructive/10"
                      onClick={() => setIsConfirmingClear(true)}
                  >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Clear All History
                  </Button>
              </div>
          ) : (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 animate-in zoom-in-95 duration-200">
                  <p className="text-[11px] font-bold text-destructive mb-3 text-center uppercase tracking-tighter">Purge all local snapshots? This action is permanent.</p>
                  <div className="grid grid-cols-2 gap-2">
                      <Button 
                          variant="destructive" 
                          className="h-9 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-destructive/20"
                          onClick={handleCleanAll}
                          disabled={isClearing}
                      >
                          {isClearing ? "Purging..." : "Yes, Purge Everything"}
                      </Button>
                      <Button 
                          variant="outline" 
                          className="h-9 text-[10px] font-black uppercase tracking-widest border-border/40 hover:bg-background"
                          onClick={() => setIsConfirmingClear(false)}
                      >
                          Cancel
                      </Button>
                  </div>
              </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
