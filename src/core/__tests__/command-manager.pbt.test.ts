import * as fc from 'fast-check';
import { CommandManager } from '../state/command-manager';
import { Command } from '../state/command-interface';

/**
 * Mock command for testing CommandManager invariants
 */
class CounterCommand implements Command {
  public executeCount = 0;
  public undoCount = 0;
  
  constructor(public label: string = 'Counter') {}

  execute(): void {
    this.executeCount++;
  }

  undo(): void {
    this.undoCount++;
  }
}

describe('CommandManager Property-Based Tests', () => {
  let manager: CommandManager;

  beforeEach(() => {
    manager = new CommandManager();
  });

  test('Undo and Redo maintain correct stack sizes and execute/undo calls', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 20 }),
        (labels) => {
          manager.clear();
          const commands = labels.map(l => new CounterCommand(l));
          
          // Execute all commands
          commands.forEach(cmd => manager.execute(cmd));
          
          expect(manager.hasUndo()).toBe(true);
          expect(manager.hasRedo()).toBe(false);
          commands.forEach(cmd => {
            expect(cmd.executeCount).toBe(1);
            expect(cmd.undoCount).toBe(0);
          });

          // Undo all commands
          for (let i = 0; i < commands.length; i++) {
            manager.undo();
          }

          expect(manager.hasUndo()).toBe(false);
          expect(manager.hasRedo()).toBe(true);
          commands.forEach(cmd => {
            expect(cmd.executeCount).toBe(1);
            expect(cmd.undoCount).toBe(1);
          });

          // Redo all commands
          for (let i = 0; i < commands.length; i++) {
            manager.redo();
          }

          expect(manager.hasUndo()).toBe(true);
          expect(manager.hasRedo()).toBe(false);
          commands.forEach(cmd => {
            expect(cmd.executeCount).toBe(2);
            expect(cmd.undoCount).toBe(1);
          });
        }
      )
    );
  });

  test('Executing new command clears redo stack', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (initialCount, undoCount) => {
          manager.clear();
          if (undoCount > initialCount) undoCount = initialCount;
          
          for (let i = 0; i < initialCount; i++) {
            manager.execute(new CounterCommand());
          }
          
          for (let i = 0; i < undoCount; i++) {
            manager.undo();
          }
          
          expect(manager.hasRedo()).toBe(undoCount > 0);
          
          manager.execute(new CounterCommand());
          expect(manager.hasRedo()).toBe(false);
        }
      )
    );
  });
});
