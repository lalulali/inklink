/**
 * Feature: File Permission Dialog
 * Purpose: A beautiful, branded modal asking for browser file write permission
 */

"use client";

import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from './ui/dialog';
import { Button } from './ui/button';
import { globalState } from '@/core/state/state-manager';
import { FileEdit, ShieldCheck } from 'lucide-react';

export function FilePermissionDialog() {
  const [request, setRequest] = useState(globalState.getState().filePermissionRequest);

  useEffect(() => {
    return globalState.subscribe(s => setRequest(s.filePermissionRequest));
  }, []);

  if (!request) return null;

  const handleGrant = async () => {
    try {
      // Trigger the browser-native dialog
      // Casting handle to any as standard TS lib.dom.d.ts often misses the File System Access API return types
      const status = await (request.handle as any).requestPermission({ mode: 'readwrite' });
      
      if (status === 'granted') {
        // Clear request status
        globalState.setState({ filePermissionRequest: null });
        
        // Re-trigger global save event now that we have permission
        window.dispatchEvent(new CustomEvent('inklink-file-save'));
      }
    } catch (err) {
      console.error('Permission request failed:', err);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => globalState.setState({ filePermissionRequest: null })}>
      <DialogContent className="max-w-md border-border sm:rounded-2xl shadow-2xl bg-background overflow-hidden p-0">
        <div className="p-8 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 mx-auto animate-bounce">
             <FileEdit className="h-8 w-8" />
          </div>
          <DialogHeader className="text-center sm:text-center mb-6">
            <DialogTitle className="text-2xl font-bold tracking-tight">Write Permission Required</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2 px-4 leading-relaxed">
              Your browser requires manual approval to save changes directly to: 
              <br/>
              <span className="font-mono text-primary font-bold break-all mt-2 inline-block">
                {request.handle.name}
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <DialogFooter className="bg-muted/30 p-6 flex flex-col gap-3 sm:flex-col sm:justify-start sm:space-x-0">
          <Button 
            className="w-full h-12 uppercase tracking-widest font-black text-xs shadow-lg group"
            onClick={handleGrant}
          >
            <ShieldCheck className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
            Grant Permission
          </Button>
          <Button 
            variant="ghost" 
            className="w-full h-11 text-muted-foreground font-bold text-[10px] uppercase tracking-wider"
            onClick={() => globalState.setState({ filePermissionRequest: null })}
          >
            Continue Without Saving
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
