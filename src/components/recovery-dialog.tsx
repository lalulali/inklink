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
import { History as HistoryIcon, Trash2, FileText, RefreshCw, X, Check, Database } from 'lucide-react';
import { WebStorageAdapter } from '@/platform/web/web-storage-adapter';
import type { AutoSaveRecord } from '@/core/types';
import { createMarkdownParser } from '@/core/parser/markdown-parser';
import { ColorManager } from '@/core/theme/color-manager';

export function RecoveryDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [allRecords, setAllRecords] = React.useState<AutoSaveRecord[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [confirmingDiscardId, setConfirmingDiscardId] = React.useState<string | null>(null);
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

  const handleDiscardRecord = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await storage.clearAutoSave(id);
    const updated = allRecords.filter(r => (r.id || 'current') !== id);
    setAllRecords(updated);
    
    if (selectedId === id) {
      if (updated.length > 0) {
        setSelectedId(updated[0].id || 'current');
      } else {
        setSelectedId(null);
        globalState.setState({ isRecoveryDialogOpen: false, recoveryRecord: null });
      }
    }
    setConfirmingDiscardId(null);
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
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-background border-border/60 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold tracking-tight">Browser Storage</DialogTitle>
            <DialogDescription>
              Restore mind maps stored in your browser's local cache. 
              These snapshots are automatically captured as you work.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-8 overflow-hidden flex-1">
            {/* List of sessions */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {latestRecord && (
                <div className="mb-6">
                  <div className="text-[10px] uppercase font-black tracking-widest text-primary/70 mb-3 px-1 flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                    Latest Activity
                  </div>
                  {(() => {
                      const id = latestRecord.id || 'current';
                      const isSelected = selectedId === id;
                      const isDiscarding = confirmingDiscardId === id;
                      const date = new Date(latestRecord.timestamp);
                      const label = latestRecord.filePath ? latestRecord.filePath.split('/').pop() : 'Unsaved Mind Map';
                      
                      return (
                        <div className="relative group">
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSelectedId(id)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all group relative overflow-hidden ${
                              isSelected 
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                                : 'border-border hover:border-primary/40 hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-4 pr-10">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-primary'}`}>
                                {latestRecord.filePath ? <FileText className="h-5 w-5" /> : <Database className="h-5 w-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">
                                  {label}
                                </p>
                                <p className="text-[10px] text-muted-foreground/80 truncate font-medium mt-1">
                                  Snapshot from {date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </button>

                          {/* Vertically Centered Delete Actions */}
                          <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1 z-10">
                            {isDiscarding ? (
                              <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-red-500 shadow-sm animate-in zoom-in-95">
                                <Button 
                                  variant="destructive" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => handleDiscardRecord(id, e)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => { e.stopPropagation(); setConfirmingDiscardId(null); }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground/60 hover:text-white hover:bg-red-500 border border-transparent transition-all rounded-lg"
                                onClick={(e) => { e.stopPropagation(); setConfirmingDiscardId(id); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                  })()}
                </div>
              )}

              {otherRecords.length > 0 && (
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/45 mb-3 px-1">
                    Previous Sessions
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 mini-scrollbar pr-1">
                    {otherRecords.map((r) => {
                      const id = r.id || 'current';
                      const isSelected = selectedId === id;
                      const isDiscarding = confirmingDiscardId === id;
                      const date = new Date(r.timestamp);
                      const label = r.filePath ? r.filePath.split('/').pop() : 'Untitled Mind Map';

                      return (
                        <div key={id} className="relative group">
                          <button
                            type="button"
                            onClick={() => setSelectedId(id)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all group relative overflow-hidden ${
                              isSelected 
                                ? 'border-primary/40 bg-primary/5' 
                                : 'border-border/40 hover:border-primary/20 hover:bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center gap-3 pr-8">
                              <div className={`p-1.5 rounded-md transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'}`}>
                                {r.filePath ? <FileText className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                  {label}
                                </p>
                                <p className="text-[9px] font-medium text-muted-foreground/60 mt-0.5">
                                  {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </button>

                          {/* Vertically Centered Delete Actions */}
                          <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1 z-10">
                            {isDiscarding ? (
                              <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-red-500/50 shadow-sm animate-in fade-in zoom-in-95">
                                <Button 
                                  variant="destructive" 
                                  size="icon" 
                                  className="h-7 w-7" 
                                  onClick={(e) => handleDiscardRecord(id, e)}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7" 
                                  onClick={(e) => { e.stopPropagation(); setConfirmingDiscardId(null); }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground/60 hover:text-white hover:bg-red-500 border border-transparent transition-all rounded-md"
                                onClick={(e) => { e.stopPropagation(); setConfirmingDiscardId(id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Selection details */}
            <div className="w-full sm:w-72 flex flex-col gap-4 border-l border-border/30 pl-8 overflow-y-auto mini-scrollbar">
              <div className="space-y-6">
                 <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mb-2">Session Details</p>
                    {selectedRecord ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 shadow-inner">
                             <div className="text-[10px] text-primary/60 font-medium mb-1 uppercase tracking-wider">Storage ID</div>
                             <div className="text-xs font-mono font-bold text-primary truncate">
                               {selectedId}
                             </div>
                         </div>
                         
                         <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-border/40 pb-2">
                                <p className="text-[10px] text-muted-foreground/70 font-bold uppercase">Estimated Size</p>
                                <p className="text-xs font-bold">{(selectedRecord.markdown.length / 1024).toFixed(1)} KB</p>
                            </div>
                            <div className="flex justify-between items-center border-b border-border/40 pb-2">
                                <p className="text-[10px] text-muted-foreground/70 font-bold uppercase">Last Updated</p>
                                <p className="text-xs font-bold">
                                    {new Date(selectedRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                         </div>

                         <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex gap-3 italic">
                             <RefreshCw className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                             <p className="text-[11px] text-orange-700/80 dark:text-orange-300/80 leading-relaxed font-medium">
                               Note: Restoring this session will replace your current active workspace.
                             </p>
                         </div>
                      </div>
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center text-muted-foreground/40 italic text-xs gap-3">
                        <HistoryIcon className="w-8 h-8 opacity-20" />
                        <p>Select a session to view details</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 px-6 py-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center self-start sm:self-auto">
                {!isConfirmingClear ? (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[11px] font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all h-8 px-2"
                        onClick={() => setIsConfirmingClear(true)}
                    >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Clear All History
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                        <span className="text-[11px] font-black text-destructive uppercase tracking-tighter mr-1">Purge all history?</span>
                        <Button 
                            variant="destructive" 
                            size="sm"
                            className="h-7 px-3 text-[10px] font-black uppercase tracking-widest shadow-sm"
                            onClick={handleCleanAll}
                            disabled={isClearing}
                        >
                            {isClearing ? "..." : "Confirm"}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 px-2 text-[10px] font-bold uppercase"
                            onClick={() => setIsConfirmingClear(false)}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
                <Button 
                    variant="ghost" 
                    onClick={() => globalState.setState({ isRecoveryDialogOpen: false, recoveryRecord: null })}
                    className="flex-1 sm:flex-none font-medium text-muted-foreground"
                >
                    Start New Session
                </Button>
                <Button 
                    onClick={handleRestore} 
                    disabled={!selectedRecord}
                    className="flex-1 sm:flex-none font-bold min-w-[140px] shadow-lg shadow-primary/20"
                >
                    Restore Session
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
