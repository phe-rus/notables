/**
 * App-wide confirmation dialogs, replacing the browser's `confirm`.
 * `await confirmDialog({...})` resolves true when confirmed. Render one
 * `<DialogHost />`.
 */
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions are shown in red and are not the default button. */
  destructive?: boolean;
}

export interface PendingDialog extends ConfirmOptions {
  id: number;
  resolve: (confirmed: boolean) => void;
}

let current: PendingDialog | null = null;
let nextId = 1;
const queue: PendingDialog[] = [];
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = { ...options, id: nextId++, resolve };
    if (current) queue.push(dialog);
    else current = dialog;
    emit();
  });
}

export function settleDialog(confirmed: boolean) {
  if (!current) return;
  current.resolve(confirmed);
  current = queue.shift() ?? null;
  emit();
}

export function subscribeDialogs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDialog(): PendingDialog | null {
  return current;
}
