/**
 * Feature: Main Application Page
 * Purpose: Entry point for the Markdown to Mind Map Generator application
 * Dependencies: React, Next.js App Router, Toolbar, Canvas, Minimap
 */

"use client";

import React from 'react';
import { globalState } from '@/core/state/state-manager';
import { Toolbar } from "@/components/toolbar";
import { Canvas } from "@/components/canvas";
import { Minimap } from "@/components/minimap";
import { ImageOverlay } from "@/components/image-overlay";
import { SearchPanel } from "@/components/search-panel";
import { KeyboardHandler } from "@/components/keyboard-handler";
import { StatusBar } from "@/components/status-bar";
import { Toaster } from "@/components/ui/toaster";
import { MarkdownEditor } from "@/components/markdown-editor";
import { FilePermissionDialog } from "@/components/file-permission-dialog";
import { ExportDialog } from "@/components/export-dialog";
import { AppReferenceDialog } from "@/components/app-reference-dialog";
import { RecoveryDialog } from "@/components/recovery-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { LearnBasicsDrawer } from "@/components/learn-basics-drawer";
import { cn } from "@/lib/utils";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Root Application Component
 * Assembles the mind map generator layout with toolbar, canvas, and minimap.
 * On mobile: stacks vertically with a slide-in drawer for the editor.
 * On desktop: side-by-side resizable split view.
 */
export default function Home() {
  const [editorVisible, setEditorVisible] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);

  // Persistence: Restore layout preference and randomized fun word on mount
  const [editorWidth, setEditorWidth] = React.useState(0);
  const isResizingRef = React.useRef(false);
  const widthRef = React.useRef(0);

  // Sync ref with state
  React.useEffect(() => {
    widthRef.current = editorWidth;
  }, [editorWidth]);

  // Detect mobile breakpoint (< 768px === md breakpoint)
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Initial load — editor hidden by default on mobile
  React.useEffect(() => {
    const savedWidth = localStorage.getItem('inklink_editor_width');
    const minWidth = window.innerWidth * 0.25;
    const initialWidth = savedWidth ? Math.max(minWidth, parseInt(savedWidth)) : minWidth;
    setEditorWidth(initialWidth);
    
    const isInitialMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isInitialMobile) {
      setEditorVisible(false);
    }
  }, []);

  const [isResizing, setIsResizing] = React.useState(false);

  // Resize handling (desktop only)
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const minWidth = window.innerWidth * 0.25;
      const maxWidth = window.innerWidth * 0.75;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
      setEditorWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        globalState.setState({ isResizing: false });
        document.body.style.cursor = 'default';
        localStorage.setItem('inklink_editor_width', widthRef.current.toString());
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  React.useEffect(() => {
    const { getRandomFunWord } = require('@/core/constants/branding');
    
    // 1. Restore layout direction
    const savedLayout = localStorage.getItem('inklink_layout_direction');
    let layoutToSet = 'two-sided';
    if (savedLayout) {
      const { isLayoutDirection } = require('@/core/types/type-guards');
      if (isLayoutDirection(savedLayout)) {
        layoutToSet = savedLayout;
      }
    }

    // 2. Set stable initial client state
    globalState.setState({ 
      layoutDirection: layoutToSet as any,
      currentFallbackRootName: getRandomFunWord()
    });

    const handleOpenEditor = () => setEditorVisible(true);
    const handleToggleEditor = () => setEditorVisible(v => !v);
    
    window.addEventListener('inklink-editor-show', handleOpenEditor);
    window.addEventListener('inklink-editor-toggle', handleToggleEditor);
    
    return () => {
      window.removeEventListener('inklink-editor-show', handleOpenEditor);
      window.removeEventListener('inklink-editor-toggle', handleToggleEditor);
    };
  }, []);

  return (
    /**
     * Use dvh (dynamic viewport height) for correct sizing on mobile browsers
     * where the address bar shrinks/grows. Falls back to 100vh on unsupported browsers.
     */
    <main
      className="flex w-full flex-col overflow-hidden bg-background select-none"
      style={{ height: '100dvh' }}
    >
      {/* Primary Navigation / Action Bar */}
      <Toolbar onToggleEditor={() => setEditorVisible(!editorVisible)} editorVisible={editorVisible} />
      
      {/* Main Workspace Area */}
      <div className="relative flex-1 overflow-hidden h-full w-full flex flex-row min-h-0">
        {/* ── DESKTOP: Resizable sidebar editor ─────────────────────────── */}
        {!isMobile && editorVisible && editorWidth > 0 && (
          <>
            <div
              className={cn(
                "hidden h-full shrink-0 border-r bg-background md:block relative group overflow-hidden",
                !isResizing && "transition-[width] duration-300 ease-in-out"
              )}
              style={{ width: editorWidth }}
            >
              <MarkdownEditor />
            </div>

            {/* Professional Resize Handle */}
            <div
              className="hidden md:flex w-1.5 h-full cursor-col-resize hover:bg-primary/40 active:bg-primary transition-colors z-50 items-center justify-center group"
              onMouseDown={(e) => {
                e.preventDefault();
                isResizingRef.current = true;
                setIsResizing(true);
                globalState.setState({ isResizing: true });
                document.body.style.cursor = 'col-resize';
              }}
            >
              <div className="w-[1px] h-8 bg-border group-hover:bg-primary/60 transition-colors" />
            </div>
          </>
        )}

        {/* Canvas + Overlays — always visible */}
        <div className="relative flex-1 overflow-hidden h-full w-full min-w-0">
          {/* SVG Drawing Surface */}
          <Canvas />
          
          {/* Search Panel Component */}
          <SearchPanel />
          
          {/* Navigation Context / Overview */}
          <Minimap />
        </div>
      </div>

      <StatusBar />
      <KeyboardHandler />
      {/* Branded modal for keyboard shortcut reference */}
      <AppReferenceDialog />
      {/* Branded modal for file export preferences */}
      <ExportDialog />
      {/* Branded modal for file permission explanation */}
      <FilePermissionDialog />
      <RecoveryDialog />
      <SettingsDialog />
      <LearnBasicsDrawer />
      <ImageOverlay />
      {/* Persistent global notification layer */}
      <Toaster />

      {/* MOBILE: Fullscreen Side Drawer Editor (Slide-in from left) */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-[60] w-full bg-background border-r shadow-2xl transition-transform duration-300 ease-in-out md:hidden flex flex-col",
          editorVisible && isMobile ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ top: '56px', height: 'calc(100dvh - 56px)' }}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden relative">
            <MarkdownEditor onClose={() => setEditorVisible(false)} />
          </div>
        </div>
      </div>

      {/* MOBILE: Drawer Backdrop (Close on click) */}
      {isMobile && editorVisible && (
        <div 
          className="fixed inset-0 bg-black/40 z-[55] md:hidden animate-in fade-in duration-300"
          onClick={() => setEditorVisible(false)}
          style={{ top: '56px' }}
        />
      )}
    </main>
  );
}