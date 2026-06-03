/**
 * useConfirm.ts — Imperative confirm dialog backed by shadcn AlertDialog.
 *
 * Replaces browser `confirm()` which is blocked in sandboxed iframes.
 * Renders a confirm dialog imperatively via ReactDOM root.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm("Delete this draft? This cannot be undone.");
 *   if (ok) { ... }
 */

import { useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

function ConfirmDialog({
  message,
  onResolve,
}: {
  message: string;
  onResolve: (value: boolean) => void;
}) {
  return (
    <AlertDialog defaultOpen onOpenChange={(open) => { if (!open) onResolve(false); }}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono">Confirm</AlertDialogTitle>
          <AlertDialogDescription className="font-mono text-sm">{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onResolve(true)}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useConfirm() {
  return useCallback((message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      function cleanup(value: boolean) {
        root.unmount();
        container.remove();
        resolve(value);
      }

      root.render(<ConfirmDialog message={message} onResolve={cleanup} />);
    });
  }, []);
}
