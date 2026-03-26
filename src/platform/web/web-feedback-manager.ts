/**
 * Feature: Feedback Manager
 * Purpose: Provides user interface feedback and window event handling for unsaved changes
 * Dependencies: StateManager
 */

"use client";

import { useEffect } from 'react';

/**
 * Manages browser-level feedback such as beforeunload dialogs
 */
export function useFeedbackManager(isDirty: boolean) {
  useEffect(() => {
    /**
     * Prevent accidental window closing if there are unsaved changes
     */
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Trigger browser confirmation dialog
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  /**
   * Simple visual/haptic feedback trigger
   */
  const triggerSuccessPulse = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10); // Subtle haptic feedback
    }
  };

  return { triggerSuccessPulse };
}
