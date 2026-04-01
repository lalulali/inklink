/**
 * Feature: Export Dialog
 * Purpose: Provides a high-fidelity interface for exporting mind maps to various formats
 */

"use client";

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { globalState } from '@/core/state/state-manager';
import { useWebPlatform } from "@/platform/web/web-platform-context";
import { useNotification } from "@/platform/web/web-notification-manager";
import { 
  Image as ImageIcon, 
  Check, 
  Globe,
  Settings2,
  Paintbrush
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ExportFormatType = 'html' | 'png' | 'svg';
type PNGBackground = 'transparent' | 'white' | 'dark';

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormatType>('png');
  const [bg, setBg] = useState<PNGBackground>('white');
  const [exporting, setExporting] = useState(false);
  const { export: exportMgr } = useWebPlatform();
  const { showSuccess, showError, showInfo } = useNotification();

  useEffect(() => {
    return globalState.subscribe(s => setOpen(s.isExportDialogOpen));
  }, []);

  const close = () => {
    globalState.setState({ isExportDialogOpen: false });
  };

  const executeExport = async () => {
    setExporting(true);
    try {
      showInfo(`Preparing ${format.toUpperCase()} export...`);
      const svg = document.querySelector('#inklink-mindmap-canvas svg');
      if (!svg) throw new Error('Visual elements not found on the canvas');
      
      const state = globalState.getState();
      const fullPath = state.filePath || 'Inklink Mind Map';
      const fileName = fullPath.split(/[/\\]/).pop() || 'Inklink Mind Map';
      const title = fileName.replace(/\.md$/, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (format === 'html') {
        const state = globalState.getState();
        if (!state.tree) throw new Error('Mind map data is currently empty');
        const content = (exportMgr as any).exportToHTML(state.tree, title, state.layoutDirection);
        const blob = new Blob([content], { type: 'text/html' });
        downloadBlob(blob, `${title}-${timestamp}.html`);
      } else if (format === 'png') {
        const blob = await (exportMgr as any).exportToPNG(svg as SVGSVGElement, bg);
        downloadBlob(blob, `${title}-${timestamp}.png`);
      } else if (format === 'svg') {
        const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
        downloadBlob(blob, `${title}-${timestamp}.svg`);
      }

      showSuccess(`Mind map exported as ${format.toUpperCase()}`);
      close();
    } catch (err: any) {
      showError('Export Failed', err.message);
    } finally {
      setExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-background border-border/60 shadow-2xl">
        <div className="p-6 space-y-6">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight">Export Mind Map</DialogTitle>
                <DialogDescription>
                    Choose your preferred format and customize your background settings for a high-quality preview.
                </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
                <button 
                   type="button"
                   onClick={() => setFormat('png')}
                   className={cn(
                    "relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 text-center group",
                    format === 'png' ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/40 hover:bg-muted/50"
                   )}
                >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", format === 'png' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-primary transition-colors")}>
                        <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">Image (PNG)</p>
                        <p className="text-[11px] text-muted-foreground">High resolution pixels</p>
                    </div>
                    {format === 'png' && <div className="absolute top-2 right-2 text-primary"><Check className="w-4 h-4 stroke-[3]" /></div>}
                </button>

                <button 
                   type="button"
                   onClick={() => setFormat('html')}
                   className={cn(
                    "relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 text-center group",
                    format === 'html' ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/40 hover:bg-muted/50"
                   )}
                >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", format === 'html' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-primary transition-colors")}>
                        <Globe className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">Interactive HTML</p>
                        <p className="text-[11px] text-muted-foreground">Standalone mind map</p>
                    </div>
                    {format === 'html' && <div className="absolute top-2 right-2 text-primary"><Check className="w-4 h-4 stroke-[3]" /></div>}
                </button>
            </div>

            {format === 'png' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/80 tracking-widest uppercase">
                        <Paintbrush className="w-3 h-3" />
                        Background Style
                    </div>
                    <div className="flex gap-2">
                        {[
                            { id: 'white', label: 'Solid White', color: '#fff', border: 'border-slate-200' },
                            { id: 'transparent', label: 'Transparent', pattern: true, border: '' },
                            { id: 'dark', label: 'Dark Grey', color: '#1e1e1e', border: 'border-slate-800' }
                        ].map((item) => (
                            <button
                                type="button"
                                key={item.id}
                                onClick={() => setBg(item.id as any)}
                                className={cn(
                                    "flex-1 h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-[11px] font-medium overflow-hidden",
                                    bg === item.id ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-muted-foreground/20"
                                )}
                            >
                                <div 
                                    className={cn(
                                        "w-full flex-1 border-b",
                                        item.pattern ? "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:10px_10px]" : ""
                                    )}
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className={cn("py-1", bg === item.id ? "text-primary font-bold" : "text-muted-foreground")}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {format === 'html' && (
                <div className="p-4 bg-muted/40 rounded-xl border border-dashed border-border flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Settings2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">Interactive features</p>
                        <p className="text-[11px] text-muted-foreground">Includes zooming, panning, and a reset view control in the standalone file.</p>
                    </div>
                </div>
            )}
        </div>

        <DialogFooter className="bg-muted/30 px-6 py-4 border-t">
           <Button variant="ghost" onClick={close} className="font-medium text-muted-foreground">
               Cancel
           </Button>
           <Button 
                onClick={executeExport} 
                disabled={exporting}
                className="font-bold min-w-[120px] shadow-lg shadow-primary/20"
            >
               {exporting ? "Generating..." : "Generate & Save"}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
