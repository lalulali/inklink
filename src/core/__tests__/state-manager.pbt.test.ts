import * as fc from 'fast-check';
import { StateManager } from '../state/state-manager';
import { applicationStateArb } from './generators';
import { ApplicationState } from '../types/application-state';

describe('StateManager Property-Based Tests', () => {
  let manager: StateManager;

  test('Immutability: State updates always return a new object reference', () => {
    fc.assert(
      fc.property(
        applicationStateArb,
        fc.record({
          loading: fc.boolean(),
          isDirty: fc.boolean(),
        }),
        (initialState, updates) => {
          manager = new StateManager(initialState);
          const prevState = manager.getState();
          
          manager.setState(updates);
          const nextState = manager.getState();
          
          if (Object.keys(updates).length > 0) {
            expect(nextState).not.toBe(prevState);
            expect(nextState.loading).toBe(updates.loading);
            expect(nextState.isDirty).toBe(updates.isDirty);
          }
        }
      )
    );
  });

  test('Observer: Listeners are notified exactly once on state change', () => {
    fc.assert(
      fc.property(
        applicationStateArb,
        fc.record({
          markdown: fc.string(),
        }),
        (initialState, updates) => {
          manager = new StateManager(initialState);
          const listener = jest.fn();
          const unsubscribe = manager.subscribe(listener);
          
          manager.setState(updates);
          
          expect(listener).toHaveBeenCalledTimes(1);
          expect(listener).toHaveBeenCalledWith(manager.getState());
          
          unsubscribe();
          manager.setState({ loading: !manager.getState().loading });
          expect(listener).toHaveBeenCalledTimes(1); // No new calls
        }
      )
    );
  });

  test('Partial update does not affect other properties', () => {
    fc.assert(
      fc.property(
        applicationStateArb,
        fc.string(),
        (initialState, newMarkdown) => {
          manager = new StateManager(initialState);
          const oldTransform = initialState.transform;
          
          manager.setState({ markdown: newMarkdown });
          
          const newState = manager.getState();
          expect(newState.markdown).toBe(newMarkdown);
          expect(newState.transform).toEqual(oldTransform);
        }
      )
    );
  });
});
