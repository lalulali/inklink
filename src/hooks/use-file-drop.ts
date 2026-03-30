/**
 * Feature: File Drop Handler
 * Purpose: Provides common logic for dragging and dropping markdown files into the app
 */

import { useCallback, useState } from 'react';
import { globalState } from '@/core/state/state-manager';
import { createMarkdownParser } from '@/core/parser/markdown-parser';
import { ColorManager } from '@/core/theme/color-manager';
import { useNotification } from '@/platform/web/web-notification-manager';

export function useFileDrop() {
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

      // Try to get a FileSystemHandle if supported (allows re-saving)
      let handle: any = null;
      if ('getAsFileSystemHandle' in DataTransferItem.prototype) {
        const item = Array.from(e.dataTransfer.items).find(i => i.kind === 'file');
        if (item) {
          handle = await (item as any).getAsFileSystemHandle();
        }
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (typeof content !== 'string') return;

        const parser = createMarkdownParser();
        const tree = parser.parse(content);
        ColorManager.assignBranchColors(tree);

        globalState.setState({
          markdown: content,
          tree,
          currentFile: {
            handle,
            path: mdFile.name,
            name: mdFile.name
          },
          filePath: mdFile.name,
          isDirty: false,
          lastSaved: new Date()
        });

        showSuccess('File loaded', `Successfully opened ${mdFile.name}`);
      };

      reader.onerror = () => {
        showError('Read failed', 'Could not read the file content.');
      };

      reader.readAsText(mdFile);
    } catch (err: any) {
      showError('Drop failed', err.message || 'Unknown error');
    }
  }, [showSuccess, showError, showInfo]);

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}
