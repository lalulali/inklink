/**
 * Feature: Mobile Editor Drawer
 * Purpose: Provides a slide-in bottom sheet / full-screen drawer for the markdown editor on mobile devices.
 * Dependencies: MarkdownEditor, globalState, lucide-react
 */

"use client";

import React from "react";
import { X as XIcon } from "lucide-react";
import { MarkdownEditor } from "./markdown-editor";

import { cn } from "@/lib/utils";

/**
 * Quick-action shortcuts injected above the mobile keyboard.
 * Each entry inserts a markdown snippet at the cursor position.
 */
const QUICK_ACTIONS = [
  { label: "H1", insert: "# " },
  { label: "H2", insert: "## " },
  { label: "H3", insert: "### " },
  { label: "-", insert: "- " },
  { label: "[ ]", insert: "- [ ] " },
  { label: "**B**", insert: "****", cursorOffset: 2 },
  { label: "_I_", insert: "__", cursorOffset: 1 },
  { label: "`C`", insert: "``", cursorOffset: 1 },
];

interface MobileEditorDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileEditorDrawer({ open, onClose }: MobileEditorDrawerProps) {
  // Trap body scroll while drawer is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleQuickAction = (insert: string, cursorOffset?: number) => {
    // Fire a custom event that MarkdownEditor can handle
    window.dispatchEvent(
      new CustomEvent("inklink-editor-insert", {
        detail: { insert, cursorOffset },
      })
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — slides in from the left on mobile */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 flex flex-col bg-background shadow-2xl",
          "w-[92vw] max-w-sm transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ height: "100dvh" }}
        aria-modal="true"
        role="dialog"
        aria-label="Markdown Editor"
      >
        {/* Drawer header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-4">
          <span className="text-sm font-semibold text-foreground">
            Markdown Source
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close editor"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Editor body — takes all remaining space */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <MarkdownEditor />
        </div>

        {/* Quick-action markdown bar above the keyboard */}
        <div className="shrink-0 border-t bg-muted/40 px-2 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {QUICK_ACTIONS.map((action) => (
            <button
              type="button"
              key={action.label}
              onMouseDown={(e) => {
                // Prevent blur on editor before inserting
                e.preventDefault();
                handleQuickAction(action.insert, action.cursorOffset);
              }}
              className={cn(
                "shrink-0 rounded-md border border-border/60 bg-background px-2.5 py-1",
                "text-xs font-mono font-medium text-foreground",
                "hover:bg-muted active:scale-95 transition-all duration-100",
                "min-w-[36px] text-center"
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
