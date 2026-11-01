export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  reference?: string;
  values?: Record<string, string>;
};

export const initialFormState: FormState = { ok: false };

export function formValues(
  fd: FormData,
  keys: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = fd.get(k);
    if (typeof v === "string") out[k] = v;
  }
  return out;
}
