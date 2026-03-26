/**
 * Feature: Main Application Page
 * Purpose: Entry point for the Markdown to Mind Map Generator application
 * Dependencies: React, Next.js App Router, Toolbar, Canvas, Minimap
 */

"use client";

import React from 'react';
import { Toolbar } from "@/components/toolbar";
import { Canvas } from "@/components/canvas";
import { Minimap } from "@/components/minimap";
import { SearchPanel } from "@/components/search-panel";
import { KeyboardHandler } from "@/components/keyboard-handler";
import { StatusBar } from "@/components/status-bar";
import { Toaster } from "@/components/ui/toaster";
import { MarkdownEditor } from "@/components/markdown-editor";

/**
 * Root Application Component
 * Assembles the mind map generator layout with toolbar, canvas, and minimap
 */
export default function Home() {
  const [editorVisible, setEditorVisible] = React.useState(true);

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-background select-none">
      {/* Primary Navigation / Action Bar */}
      <Toolbar onToggleEditor={() => setEditorVisible(!editorVisible)} editorVisible={editorVisible} />
      
      {/* Main Workspace Area */}
      <div className="relative flex-1 overflow-hidden h-full w-full flex flex-row">
         {/* Markdown Source Editor Code View */}
         {editorVisible && (
          <div className="hidden h-full w-[350px] shrink-0 border-r bg-muted/20 md:block lg:w-[450px]">
            <MarkdownEditor />
          </div>
        )}

        <div className="relative flex-1 overflow-hidden h-full w-full">
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
      {/* Persistent global notification layer */}
      <Toaster />
    </main>
  );
}