/**
 * Feature: Load File Command
 * Purpose: Implements loading of a markdown file into the application state
 * Requirement Traceability: 
 * - Req 1: Open and load Markdown files
 * - Req 6: Undo/Redo support
 */

import { Command } from '../command-interface';
import { StateManager } from '../state-manager';
import { ApplicationState } from '../../types/application-state';
import { IndentationParser } from '../../parser/markdown-parser';

/**
 * Command to replace the current tree and markdown with content from a file
 */
export class LoadFileCommand implements Command {
  private previousState: ApplicationState;
  private newMarkdown: string;
  private filePath: string | null;
  private stateManager: StateManager;

  constructor(
    markdown: string, 
    filePath: string | null, 
    stateManager: StateManager
  ) {
    this.newMarkdown = markdown;
    this.filePath = filePath;
    this.stateManager = stateManager;
    this.previousState = stateManager.getState();
  }

  /**
   * Parses and applies the new file content
   */
  execute(): void {
    // Use the concrete IndentationParser
    const parser = new IndentationParser();
    const state = this.stateManager.getState();
    const fileName = this.filePath ? this.filePath.split('/').pop()?.replace(/\.[^/.]+$/, "") : undefined;
    const finalRootName = fileName || state.currentFallbackRootName;
    const tree = parser.parse(this.newMarkdown, finalRootName);
    
    // 2. Update state through manager
    this.stateManager.setState({
      tree,
      markdown: this.newMarkdown,
      filePath: this.filePath,
      isDirty: false,
      lastSaved: new Date()
    });
  }

  /**
   * Restores the full state snapshot captured before the load
   */
  undo(): void {
    const { 
      tree, 
      markdown, 
      filePath, 
      isDirty, 
      lastSaved 
    } = this.previousState;
    
    this.stateManager.setState({
      tree,
      markdown,
      filePath,
      isDirty,
      lastSaved
    });
  }

  get label(): string {
    return 'Load File';
  }
}
