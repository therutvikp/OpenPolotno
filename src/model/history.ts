import {
  types,
  resolvePath,
  onSnapshot,
  getSnapshot,
  applySnapshot,
  IStateTreeNode,
} from 'mobx-state-tree';
import { deepEqual } from '../utils/deep-equal';

function captureState(target: any) {
  const snap = getSnapshot<any>(target);
  return {
    pages: snap.pages,
    width: snap.width,
    height: snap.height,
    custom: snap.custom,
    audios: snap.audios,
  };
}

export const UndoManager = types
  .model('UndoManager', {
    history: types.array(types.frozen<any>()),
    undoIdx: -1,
    targetPath: '',
  })
  .views((self) => ({
    get canUndo() {
      return self.undoIdx > 0;
    },
    get canRedo() {
      return self.undoIdx < self.history.length - 1;
    },
  }))
  .actions((self) => {
    let target: any;
    let disposeSnapshot: (() => void) | undefined;
    let skipNextSnapshot = false;
    let pendingState: any = null;
    let pendingTimer: ReturnType<typeof setTimeout> | number = 0;
    let transactionDepth = 0;

    const inTransaction = () => transactionDepth > 0;

    function applyStateToTarget(state: any) {
      const currentPageIds = target.pages.map((p: any) => p.id);
      const newPageIds = state.pages.map((p: any) => p.id);
      const pagesChanged = !deepEqual(currentPageIds, newPageIds);
      const customChanged = !deepEqual(target.custom, state.custom);

      if (pagesChanged) {
        applySnapshot(target.pages, state.pages);
      } else {
        target.pages.forEach((page: any, idx: number) => {
          applySnapshot(page, state.pages[idx]);
        });
      }

      if (customChanged) {
        target.set({ custom: state.custom });
      }

      target.setSize(state.width, state.height);
    }

    return {
      startTransaction() {
        transactionDepth++;
      },

      endTransaction(skipAdd?: boolean) {
        transactionDepth--;
        if (!skipAdd) {
          this.requestAddState(captureState(target));
        }
      },

      async ignore(
        fn: () => void | Promise<void>,
        skipReplaceState = false,
        waitFrame = false,
      ) {
        if (waitFrame) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        if (pendingTimer) {
          self.addUndoState();
        }
        const wasInTransaction = inTransaction();
        self.startTransaction();
        const depthBefore = transactionDepth;
        try {
          await fn();
        } catch (err) {
          setTimeout(() => {
            throw err;
          });
        }
        const depthChanged = depthBefore !== transactionDepth;
        const shouldEnd = !depthChanged;
        self.endTransaction(shouldEnd);
        if (!skipReplaceState && !wasInTransaction) {
          this.replaceState();
        }
        if (!depthChanged) {
          clearTimeout(pendingTimer as number);
          pendingTimer = 0;
        }
      },

      async transaction(fn: () => void | Promise<void>) {
        await self.ignore(fn, true);
        this.addUndoState();
      },

      requestAddState(state: any) {
        pendingState = state;
        if (!pendingTimer && !inTransaction()) {
          if (skipNextSnapshot) {
            skipNextSnapshot = false;
          } else {
            pendingTimer = setTimeout(() => {
              pendingTimer = 0;
              clearTimeout(pendingTimer as number);
              if (!inTransaction()) {
                this.addUndoState();
              }
            }, 100);
          }
        }
      },

      addUndoState() {
        if (skipNextSnapshot) {
          skipNextSnapshot = false;
          return;
        }
        const lastState = self.history[self.undoIdx];
        if (!deepEqual(pendingState, lastState)) {
          clearTimeout(pendingTimer as number);
          pendingTimer = 0;
          self.history.splice(self.undoIdx + 1);
          self.history.push(pendingState);
          self.undoIdx = self.history.length - 1;
        }
      },

      afterCreate() {
        target = resolvePath(self, '..');
        if (!target) {
          throw new Error(
            'Failed to find target store for UndoManager. Please provide `targetPath` property, or a `targetStore` in the environment',
          );
        }
        disposeSnapshot = onSnapshot(target, () => {
          this.requestAddState(captureState(target));
        });
        if (self.history.length === 0) {
          this.requestAddState(captureState(target));
        }
      },

      clear() {
        clearTimeout(pendingTimer as number);
        pendingTimer = 0;
        self.history.splice(0, self.history.length);
        self.undoIdx = -1;
        this.addUndoState();
      },

      beforeDestroy() {
        if (disposeSnapshot) disposeSnapshot();
      },

      undo() {
        if (pendingTimer) this.addUndoState();
        if (inTransaction()) {
          applyStateToTarget(self.history[self.undoIdx]);
        } else if (self.canUndo) {
          self.undoIdx--;
          skipNextSnapshot = true;
          applyStateToTarget(self.history[self.undoIdx]);
        } else {
          console.warn(
            'No undo history. Please check `store.history.canUndo` before calling undo action.',
          );
        }
      },

      redo() {
        if (pendingTimer) this.addUndoState();
        if (self.canRedo) {
          self.undoIdx++;
          skipNextSnapshot = true;
          applyStateToTarget(self.history[self.undoIdx]);
        } else {
          console.warn(
            'No redo history. Please check `store.history.canRedo` before calling redo action.',
          );
        }
      },

      jumpTo(index: number) {
        if (index < 0 || index >= self.history.length) return;
        if (pendingTimer) {
          clearTimeout(pendingTimer as number);
          pendingTimer = 0;
        }
        self.undoIdx = index;
        skipNextSnapshot = true;
        applyStateToTarget(self.history[index]);
      },

      replaceState() {
        self.history[self.undoIdx] = captureState(target);
      },
    };
  });

export default UndoManager;
