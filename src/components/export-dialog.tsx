/**
 * Feature: Export Dialog
 * Purpose: Provides a high-fidelity interface for exporting mind maps to various formats
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { globalState } from '@/core/state/state-manager';
import { useWebPlatform } from '@/platform/web/web-platform-context';
import { useNotification } from '@/platform/web/web-notification-manager';
import { Image as ImageIcon, Check, Globe, Settings2, Paintbrush } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TreeNode } from '@/core/types/tree-node';

type ExportFormatType = 'html' | 'png' | 'svg';
type PNGBackground = 'transparent' | 'white' | 'dark';

interface SavedBlockStates {
  collapsed: boolean;
  codeBlocksExpanded: boolean[];
  quoteBlocksExpanded: boolean[];
  tableBlocksExpanded: boolean[];
}

function saveBlockAndNodeStates(node: TreeNode): SavedBlockStates {
  return {
    collapsed: node.collapsed,
    codeBlocksExpanded: (node.metadata.codeBlocks || []).map((b) => b.expanded),
    quoteBlocksExpanded: (node.metadata.quoteBlocks || []).map((b) => b.expanded),
    tableBlocksExpanded: (node.metadata.tableBlocks || []).map((b) => b.expanded),
  };
}

function restoreBlockAndNodeStates(node: TreeNode, saved: SavedBlockStates): void {
  node.collapsed = saved.collapsed;
  (node.metadata.codeBlocks || []).forEach((b, i) => {
    if (i < saved.codeBlocksExpanded.length) b.expanded = saved.codeBlocksExpanded[i];
  });
  (node.metadata.quoteBlocks || []).forEach((b, i) => {
    if (i < saved.quoteBlocksExpanded.length) b.expanded = saved.quoteBlocksExpanded[i];
  });
  (node.metadata.tableBlocks || []).forEach((b, i) => {
    if (i < saved.tableBlocksExpanded.length) b.expanded = saved.tableBlocksExpanded[i];
  });
  node.children.forEach((child) => {
    const childSaved = savedStatesMap.get(child.id);
    if (childSaved) restoreBlockAndNodeStates(child, childSaved);
  });
}

const savedStatesMap = new Map<string, SavedBlockStates>();

function expandAllBlocksAndNodes(node: TreeNode): void {
  node.collapsed = false;
  (node.metadata.codeBlocks || []).forEach((b) => {
    b.expanded = true;
  });
  (node.metadata.quoteBlocks || []).forEach((b) => {
    b.expanded = true;
  });
  (node.metadata.tableBlocks || []).forEach((b) => {
    b.expanded = true;
  });
  node.children.forEach((child) => expandAllBlocksAndNodes(child));
}

function saveAllStates(root: TreeNode): void {
  savedStatesMap.clear();
  const walk = (node: TreeNode) => {
    savedStatesMap.set(node.id, saveBlockAndNodeStates(node));
    node.children.forEach(walk);
  };
  walk(root);
}

function restoreAllStates(root: TreeNode): void {
  const rootSaved = savedStatesMap.get(root.id);
  if (rootSaved) restoreBlockAndNodeStates(root, rootSaved);
}

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormatType>('png');
  const [bg, setBg] = useState<PNGBackground>('white');
  const [exporting, setExporting] = useState(false);
  const { export: exportMgr } = useWebPlatform();
  const { showSuccess, showError, showInfo } = useNotification();

  useEffect(() => {
    return globalState.subscribe((s) => setOpen(s.isExportDialogOpen));
  }, []);

  const close = () => {
    globalState.setState({ isExportDialogOpen: false });
  };

  const executeExport = async (overrideFormat?: ExportFormatType, overrideBg?: PNGBackground) => {
    if (exporting) return;
    const activeFormat = overrideFormat ?? format;
    const activeBg = overrideBg ?? bg;

    setExporting(true);
    try {
      const state = globalState.getState();
      const tree = state.tree;
      if (!tree) throw new Error('Mind map data is currently empty');

      const fullPath = state.filePath || 'Inklink Mind Map';
      const fileName = fullPath.split(/[/\\]/).pop() || 'Inklink Mind Map';
      const title = fileName.replace(/\.md$/, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (activeFormat === 'html') {
        const content = (exportMgr as any).exportToHTML(
          tree,
          title,
          state.isDarkMode,
          state.layoutDirection
        );
        const blob = new Blob([content], { type: 'text/html' });
        downloadBlob(blob, `${title}-${timestamp}.html`);
        showSuccess(`Mind map exported as HTML`);
        close();
        return;
      }

      // For PNG/SVG: expand all blocks and nodes for full-content capture
      showInfo('Preparing image — expanding all blocks...');
      globalState.setState({ isExportingImage: true });

      saveAllStates(tree);
      expandAllBlocksAndNodes(tree);
      globalState.setState({ tree: { ...tree } });

      // Wait for React re-render + D3 transitions (250ms) + paint
      await new Promise((resolve) => setTimeout(resolve, 300));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 200));

      try {
        const svg = document.querySelector('#inklink-mindmap-canvas svg');
        if (!svg) throw new Error('Visual elements not found on the canvas');

        if (activeFormat === 'png') {
          const blob = await (exportMgr as any).exportToPNG(svg as SVGSVGElement, activeBg);
          downloadBlob(blob, `${title}-${timestamp}.png`);
        } else if (activeFormat === 'svg') {
          const clone = svg.cloneNode(true) as SVGSVGElement;
          await (exportMgr as any).inlineSVGImages(clone);
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          const styles = Array.from(document.styleSheets)
            .map((sheet: any) => {
              try {
                return Array.from(sheet.cssRules)
                  .map((r: any) => r.cssText)
                  .join('');
              } catch (e) {
                return '';
              }
            })
            .join('\n');
          const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
          styleEl.textContent = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');\n${styles}`;
          clone.prepend(styleEl);
          const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' });
          downloadBlob(blob, `${title}-${timestamp}.svg`);
        }

        showSuccess(`Mind map exported as ${activeFormat.toUpperCase()}`);
        close();
      } catch (err: any) {
        showError('Export Failed', err.message);
      } finally {
        restoreAllStates(tree);
        globalState.setState({ tree: { ...tree }, isExportingImage: false });
      }
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
              Choose your preferred format and customize your background settings for a high-quality
              preview.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('png')}
              onDoubleClick={() => executeExport('png')}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 text-center group',
                format === 'png'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  format === 'png'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground group-hover:text-primary transition-colors'
                )}
              >
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Image (PNG)</p>
                <p className="text-[11px] text-muted-foreground">High resolution pixels</p>
              </div>
              {format === 'png' && (
                <div className="absolute top-2 right-2 text-primary">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFormat('html')}
              onDoubleClick={() => executeExport('html')}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 text-center group',
                format === 'html'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  format === 'html'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground group-hover:text-primary transition-colors'
                )}
              >
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Interactive HTML</p>
                <p className="text-[11px] text-muted-foreground">Standalone mind map</p>
              </div>
              {format === 'html' && (
                <div className="absolute top-2 right-2 text-primary">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
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
                  { id: 'dark', label: 'Dark Grey', color: '#1e1e1e', border: 'border-slate-800' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setBg(item.id as any)}
                    onDoubleClick={() => executeExport('png', item.id as any)}
                    className={cn(
                      'flex-1 h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-[11px] font-medium overflow-hidden',
                      bg === item.id
                        ? 'border-primary ring-1 ring-primary/20'
                        : 'border-border hover:border-muted-foreground/20'
                    )}
                  >
                    <div
                      className={cn(
                        'w-full flex-1 border-b',
                        item.pattern
                          ? 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:10px_10px]'
                          : ''
                      )}
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className={cn(
                        'py-1',
                        bg === item.id ? 'text-primary font-bold' : 'text-muted-foreground'
                      )}
                    >
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
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Interactive features
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Includes zooming, panning, and a reset view control in the standalone file.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="bg-muted/30 px-6 py-4 border-t">
          <Button variant="ghost" onClick={close} className="font-medium text-muted-foreground">
            Cancel
          </Button>
          <Button
            onClick={() => executeExport()}
            disabled={exporting}
            className="font-bold min-w-[120px] shadow-lg shadow-primary/20"
          >
            {exporting ? 'Generating...' : 'Generate & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
