/**
 * Feature: File Drop Handler
 * Purpose: Provides common logic for dragging and dropping markdown files into the app
 */

import { useCallback, useState } from 'react';
import { globalState } from '@/core/state/state-manager';
import { createMarkdownParser } from '@/core/parser/markdown-parser';
import { ColorManager } from '@/core/theme/color-manager';
import { useNotification } from '@/platform/web/web-notification-manager';
import { generateId } from '@/lib/utils';

export function useFileDrop(autoSave?: any) {
  const { showSuccess, showError, showInfo } = useNotification();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if any item is a file
    const items = Array.from(e.dataTransfer.items);
    const hasFiles = items.some(item => item.kind === 'file');

    if (hasFiles) {
      setIsDragging(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const mdFile = files.find(file => file.name.toLowerCase().endsWith('.md'));

    if (!mdFile) {
      showError('Invalid file type', 'Only Markdown(.md) files can be dropped here.');
      return;
    }

    try {
      showInfo('Reading dropped file...');

      // Try to get a FileSystemHandle if supported (allows re-saving and session matching)
      let handle: FileSystemFileHandle | null = null;
      if ('getAsFileSystemHandle' in DataTransferItem.prototype) {
        const item = Array.from(e.dataTransfer.items).find(i => i.kind === 'file');
        if (item) {
          try {
            handle = await (item as any).getAsFileSystemHandle();
            console.debug('Dropped file handle acquired:', handle);
          } catch (hErr) {
            console.warn('Failed to get handle from drop item:', hErr);
          }
        }
      }
      
      // Need storage to check for existing session
      const storage = autoSave?.storage;
      let existingRecord = null;
      if (storage) {
        existingRecord = await storage.findMatchingRecord(handle || undefined, mdFile.name);
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        if (typeof content !== 'string') return;

        const parser = createMarkdownParser();
        const tree = parser.parse(content);
        ColorManager.assignBranchColors(tree);
        const autoSaveId = existingRecord?.id || generateId();

        globalState.setState({
          markdown: content,
          filePath: mdFile.name,
          autoSaveId: autoSaveId,
          currentFile: {
            handle: handle || undefined,
            path: mdFile.name,
            name: mdFile.name
          },
          tree,
          isDirty: false,
          lastSaved: new Date(),
          lastSaveType: 'manual'
        });

        // Trigger immediate local storage save for recovery
        if (autoSave) {
           await autoSave.forceSave(tree, mdFile.name, autoSaveId);
           console.debug('Drop: Local snapshot updated/created');
        }

        showSuccess('File loaded', `Successfully opened ${mdFile.name}`);
      };

      reader.onerror = () => {
        showError('Read failed', 'Could not read the file content.');
      };

      reader.readAsText(mdFile);
    } catch (err: any) {
      showError('Drop failed', err.message || 'Unknown error');
    }
  }, [showSuccess, showError, showInfo, autoSave]);

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}
