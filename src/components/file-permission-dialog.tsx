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
import { Lock, FileEdit, ShieldCheck } from 'lucide-react';

export function FilePermissionDialog() {
  const [request, setRequest] = useState(globalState.getState().filePermissionRequest);

  useEffect(() => {
    return globalState.subscribe(s => setRequest(s.filePermissionRequest));
  }, []);

  if (!request) return null;

  const handleGrant = async () => {
    try {
      // Trigger the browser-native dialog
      const status = await request.handle.requestPermission({ mode: 'readwrite' });
      
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
    <Dialog open={!!request} onOpenChange={(open) => !open && globalState.setState({ filePermissionRequest: null })}>
      <DialogContent className="sm:max-w-md shadow-2xl">
        <DialogHeader className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight">Direct Saving Required</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Inklink needs your permission to save changes directly to:
              <span className="block mt-1 font-mono text-primary font-medium">{request.path}</span>
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50 space-y-4">
           <div className="flex gap-3 items-start">
             <div className="mt-1 p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
               <ShieldCheck className="w-4 h-4" />
             </div>
             <div>
               <p className="text-sm font-semibold">Secure Direct Access</p>
               <p className="text-xs text-muted-foreground">Enables smooth Cmd+S saving and real-time persistence without extra dialogs.</p>
             </div>
           </div>
           <div className="flex gap-3 items-start">
             <div className="mt-1 p-1.5 rounded-md bg-blue-500/10 text-blue-500">
               <FileEdit className="w-4 h-4" />
             </div>
             <div>
               <p className="text-sm font-semibold">Local Integrity</p>
               <p className="text-xs text-muted-foreground">Your files never leave your device. We only request permission to edit the file you chose.</p>
             </div>
           </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => globalState.setState({ filePermissionRequest: null })}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            onClick={handleGrant}
          >
            Grant Permission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
