import { getVsCodeApi } from './vscode-api';
import { StorageAdapter } from '../adapters';
import type { AutoSaveRecord, UserPreferences } from '@/core/types';

/**
 * VSCode Storage Adapter Implementation
 * Uses VSCode Global/Workspace state via message passing
 */
export class VSCodeStorageAdapter implements StorageAdapter {
  private vscode: any;
  private responseHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.vscode = getVsCodeApi();
    
    window.addEventListener('message', (event: MessageEvent) => {
        const message = event.data;
        if (message.command === 'storageResponse' && message.id) {
            const handler = this.responseHandlers.get(message.id);
            if (handler) {
                handler(message.data);
                this.responseHandlers.delete(message.id);
            }
        }
    });
  }

  private generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  private async request<T>(command: string, payload: any = {}): Promise<T> {
    const id = this.generateId();
    return new Promise((resolve) => {
        this.responseHandlers.set(id, (data) => resolve(data));
        this.vscode.postMessage({
            command,
            id,
            ...payload
        });
    });
  }

  public async saveAutoSave(record: AutoSaveRecord): Promise<void> {
    await this.request('saveAutoSave', { record });
  }

  public async loadAutoSave(id?: string): Promise<AutoSaveRecord | null> {
    return this.request<AutoSaveRecord | null>('loadAutoSave', { id });
  }

  public async listAutoSaves(): Promise<AutoSaveRecord[]> {
    return this.request<AutoSaveRecord[]>('listAutoSaves');
  }

  public async deleteAutoSave(id: string): Promise<void> {
    await this.request('deleteAutoSave', { id });
  }

  public async clearAllAutoSaves(): Promise<void> {
    await this.request('clearAllAutoSaves');
  }

  public async cleanupOldAutoSaves(daysOld: number): Promise<void> {
    await this.request('cleanupOldAutoSaves', { daysOld });
  }

  public async savePreferences(prefs: UserPreferences): Promise<void> {
    await this.request('savePreferences', { prefs });
  }

  public async loadPreferences(): Promise<UserPreferences> {
    return this.request<UserPreferences>('loadPreferences');
  }
}
