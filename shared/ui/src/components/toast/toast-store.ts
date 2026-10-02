/**
 * App-wide toasts: short messages that confirm, report progress or explain
 * a failure. Call `toast` from anywhere; render one `<Toaster />`.
 */
export type ToastTone = "neutral" | "success" | "error" | "loading";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: ToastAction;
  /** Milliseconds before it leaves on its own; `null` stays until dismissed. */
  duration: number | null;
  createdAt: number;
}

export interface ToastOptions {
  description?: string;
  action?: ToastAction;
  duration?: number | null;
}

const DEFAULT_DURATION = 4200;
const MAX_VISIBLE = 3;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

function show(tone: ToastTone, title: string, options: ToastOptions = {}): number {
  const id = nextId++;
  const duration =
    options.duration !== undefined
      ? options.duration
      : tone === "loading"
        ? null
        : DEFAULT_DURATION;
  toasts = [
    {
      id,
      tone,
      title,
      description: options.description,
      action: options.action,
      duration,
      createdAt: Date.now(),
    },
    ...toasts,
  ].slice(0, MAX_VISIBLE + 2);
  emit();
  return id;
}

/** Changes a toast in place; it morphs to its new state. */
function update(id: number, tone: ToastTone, title: string, options: ToastOptions = {}) {
  if (!toasts.some((t) => t.id === id)) return show(tone, title, options);
  toasts = toasts.map((t) =>
    t.id === id
      ? {
          ...t,
          tone,
          title,
          description: options.description,
          action: options.action,
          duration:
            options.duration !== undefined
              ? options.duration
              : tone === "loading"
                ? null
                : DEFAULT_DURATION,
          createdAt: Date.now(),
        }
      : t,
  );
  emit();
  return id;
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

interface PromiseMessages<T> {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((error: unknown) => string);
}

export const toast = Object.assign(
  (title: string, options?: ToastOptions) => show("neutral", title, options),
  {
    success: (title: string, options?: ToastOptions) => show("success", title, options),
    error: (title: string, options?: ToastOptions) => show("error", title, options),
    loading: (title: string, options?: ToastOptions) => show("loading", title, options),
    update,
    dismiss,
    /** Shows progress, then morphs into the outcome. Returns the promise. */
    promise<T>(promise: Promise<T>, messages: PromiseMessages<T>): Promise<T> {
      const id = show("loading", messages.loading);
      promise.then(
        (value) =>
          update(
            id,
            "success",
            typeof messages.success === "function" ? messages.success(value) : messages.success,
          ),
        (error: unknown) =>
          update(
            id,
            "error",
            typeof messages.error === "function" ? messages.error(error) : messages.error,
          ),
      );
      return promise;
    },
  },
);

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): Toast[] {
  return toasts;
}

export const toastLimits = { visible: MAX_VISIBLE } as const;
