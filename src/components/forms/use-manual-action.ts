"use client";

import { startTransition, useCallback, type FormEvent } from "react";

/**
 * Submits a `useActionState` action from onSubmit instead of through the form's `action` prop.
 * React 19 automatically resets a form after an `action` prop submission completes, and that
 * reset runs asynchronously after the response commit. A visitor who starts correcting fields
 * the moment the validation message appears would see their edits wiped. Dispatching manually
 * keeps the response commit (and our keyed remount) as the only point where fields change.
 * The `action` prop stays on the form so submission still works before hydration.
 */
export function useManualAction(action: (payload: FormData) => void) {
  return useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      startTransition(() => action(data));
    },
    [action],
  );
}
