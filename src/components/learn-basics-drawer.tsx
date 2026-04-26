/**
 * Feature: Learn Basics Drawer
 * Purpose: Provides an interactive, visual guide for first-time users
 * Dependencies: shadcn/ui Sheet, lucide-react, globalState
 */

"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { globalState } from '@/core/state/state-manager';
import { 
  BookOpen, 
  ChevronRight, 
  MousePointer2, 
  Type, 
  Indent, 
  Zap,
  CheckCircle2,
  Move,
  Target,
  Compass,
  X as XIcon,
  Image as ImageIcon,
  Code as CodeIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LearnBasicsDrawer() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    return globalState.subscribe(s => {
      setIsOpen(s.isLearnBasicsOpen);
    });
  }, []);

  const close = () => globalState.setState({ isLearnBasicsOpen: false });

  const StepCard = ({ 
    icon: Icon, 
    title, 
    children, 
    stepNumber 
  }: { 
    icon: any, 
    title: string, 
    children: React.ReactNode,
    stepNumber: string
  }) => (
    <div className="relative p-5 rounded-2xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all group/step">
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-black text-primary shadow-sm">
        {stepNumber}
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );

  const SyntaxExample = ({ label, code }: { label: string, code: string }) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
      <code className="block p-3 rounded-lg bg-background border border-border/40 font-mono text-xs text-primary/90 whitespace-pre">
        {code}
      </code>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={open => globalState.setState({ isLearnBasicsOpen: open })}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[540px] sm:max-w-xl p-0 bg-background flex flex-col border-l border-border shadow-2xl"
        style={{ top: '56px', height: 'calc(100dvh - 56px)' }}
      >
        <SheetHeader className="p-6 border-b border-border/50 bg-background sticky top-0 z-10 flex flex-row items-start justify-between space-y-0">
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-[10px] mb-1">
              <Zap className="w-3 h-3 fill-primary" />
              Onboarding
            </div>
            <SheetTitle className="text-2xl font-bold tracking-tight">Learn the Basics</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground leading-relaxed">
              Master the Inklink syntax and transform your thoughts into visual structures in minutes.
            </SheetDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={close}
            className="rounded-full hover:bg-muted"
          >
            <XIcon className="h-5 w-5 text-muted-foreground" />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 sleek-scrollbar">
          {/* Section 1: The Core Mental Model */}
          <section className="space-y-6">
            <StepCard stepNumber="01" icon={Indent} title="The Hierarchy Rules">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Inklink builds branches using both <strong>Headings</strong> and <strong>Indentation</strong>. You can use them separately or mix them to create complex structures.
              </p>
              <div className="grid grid-cols-1 gap-6 mt-2">
                <div className="space-y-4">
                  <SyntaxExample 
                    label="Method 1: Headings" 
                    code={`# Project Alpha\n## Phase 1\n### Task A`} 
                  />
                  <SyntaxExample 
                    label="Method 2: Lists" 
                    code={`- Project Alpha\n  - Phase 1\n    - Task A`} 
                  />
                  <SyntaxExample 
                    label="Method 3: Hybrid" 
                    code={`# Project Alpha\n## Phase 1\n  - Task A`} 
                  />
                </div>
                
                <div className="p-4 rounded-xl border border-dashed border-primary/20 bg-primary/5 space-y-3">
                   <div className="text-[10px] font-bold text-primary/60 uppercase tracking-widest text-center">Same Result →</div>
                   <div className="flex items-center justify-center gap-2">
                      <div className="px-3 py-2 rounded-lg bg-background border border-primary/30 text-[10px] font-bold shadow-sm">Project Alpha</div>
                      <ChevronRight className="w-3 h-3 text-primary/40" />
                      <div className="px-3 py-2 rounded-lg bg-background border border-border text-[10px] font-bold">Phase 1</div>
                      <ChevronRight className="w-3 h-3 text-primary/40" />
                      <div className="px-3 py-2 rounded-lg bg-background border border-border text-[10px] font-bold">Task A</div>
                   </div>
                </div>
              </div>
            </StepCard>
          </section>

          {/* Section 2: Rich Content */}
          <section className="space-y-6">
            <StepCard stepNumber="02" icon={Type} title="Adding Rich Elements">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nodes aren't just text. You can embed images, code, and styles using standard Markdown.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border/40 bg-muted/10 space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Images</span>
                  </div>
                  <code className="text-[10px] text-muted-foreground">![Alt](url)</code>
                </div>
                <div className="p-3 rounded-xl border border-border/40 bg-muted/10 space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <CodeIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Code</span>
                  </div>
                  <code className="text-[10px] text-muted-foreground">`code` tags</code>
                </div>
              </div>
            </StepCard>
          </section>

          {/* Section 3: Navigation */}
          <section className="space-y-6">
            <StepCard stepNumber="03" icon={Compass} title="Navigating the Mindmap">
              <div className="grid gap-4">
                {/* 1. Pan & Zoom */}
                <div className="flex gap-4 items-start p-3 rounded-xl border border-border/40 bg-muted/5">
                  <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                    <Move className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1">Pan & Zoom</p>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Click and drag the empty canvas to pan. Use your mouse wheel or trackpad to zoom in and out.
                    </p>
                  </div>
                </div>

                {/* 2. Double Click */}
                <div className="flex gap-4 items-start p-3 rounded-xl border border-border/40 bg-muted/5">
                  <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                    <MousePointer2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1">Interactive Teleport</p>
                    <p className="text-[11px] text-muted-foreground leading-normal font-medium">
                      Double-click any node to instantly jump to its exact location in the Markdown editor.
                    </p>
                  </div>
                </div>

                {/* 3. Editor Sync */}
                <div className="flex gap-4 items-start p-3 rounded-xl border border-border/40 bg-muted/5">
                  <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1">Editor-Sync Focus</p>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Move your cursor in the editor to automatically center and highlight the matching node in the map.
                    </p>
                  </div>
                </div>

                {/* 4. Expand/Collapse */}
                <div className="flex gap-4 items-start p-3 rounded-xl border border-border/40 bg-muted/5">
                  <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1">Structure Management</p>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Click the circular handle next to a node to collapse or expand its entire branch.
                    </p>
                  </div>
                </div>
              </div>
            </StepCard>
          </section>

          {/* Final CTA */}
          <div className="p-8 rounded-3xl bg-primary text-primary-foreground space-y-4 text-center shadow-xl shadow-primary/20">
             <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                <Zap className="w-6 h-6 fill-white" />
             </div>
             <h3 className="text-lg font-bold">Ready for the full experience?</h3>
             <p className="text-xs text-primary-foreground/80 leading-relaxed px-4">
               The best way to learn is by seeing it in action. Load the full showcase to explore all features.
             </p>
             <Button 
               onClick={() => {
                 globalState.setState({ isLearnBasicsOpen: false });
                 window.dispatchEvent(new CustomEvent('inklink-file-open-example'));
               }}
               variant="secondary" 
               className="w-full h-11 rounded-xl font-bold text-primary hover:bg-white transition-all shadow-sm"
             >
               Load Feature Showcase
             </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
