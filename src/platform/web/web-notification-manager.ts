/**
 * Feature: Notification Manager
 * Purpose: Provides application-level notifications (toasts) for user feedback
 * Dependencies: use-toast hook from shadcn/ui
 */

"use client";

import { useToast } from "@/components/ui/use-toast";

/**
 * Hook for managing application-wide notifications
 */
export function useNotification() {
  const { toast } = useToast();

  /**
   * Show success notification
   */
  const showSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default",
      duration: 3000,
    });
  };

  /**
   * Show error notification with destructive styling
   */
  const showError = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "destructive",
      duration: 5000,
    });
  };

  /**
   * Show warning notification
   */
  const showWarning = (title: string, description?: string) => {
    toast({
      title: `⚠️ ${title}`,
      description,
      variant: "default",
      duration: 4000,
    });
  };

  /**
   * Show info notification
   */
  const showInfo = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default",
      duration: 2000,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
