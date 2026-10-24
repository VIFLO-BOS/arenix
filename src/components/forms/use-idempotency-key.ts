"use client";

import { useEffect, useRef } from "react";

/**
 * Attaches a client generated idempotency key to a hidden input after hydration, so the server
 * rendered markup (empty value) always matches the client. The key is generated once per
 * component instance and re-applied after every render, so a keyed remount of the form after a
 * validation error keeps the same key and a retry stays duplicate safe.
 */
export function useIdempotencyKey() {
  const ref = useRef<HTMLInputElement>(null);
  const key = useRef<string>("");
  useEffect(() => {
    if (!key.current) key.current = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const el = ref.current;
    if (el && el.value !== key.current) el.value = key.current;
  });
  return ref;
}
