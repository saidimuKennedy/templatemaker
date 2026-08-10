export type SubmitFormFieldErrors = Readonly<Record<string, readonly string[]>>;

export type SubmitFormResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly fieldErrors?: SubmitFormFieldErrors;
      readonly rateLimited?: boolean;
      readonly retryAfterSeconds?: number;
      readonly error?: string;
    };

function parseFieldErrors(details: unknown): SubmitFormFieldErrors | undefined {
  if (typeof details !== "object" || details === null) {
    return undefined;
  }
  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors;
  if (typeof fieldErrors !== "object" || fieldErrors === null || Array.isArray(fieldErrors)) {
    return undefined;
  }
  const result: Record<string, readonly string[]> = {};
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (Array.isArray(value)) {
      result[key] = value.filter((entry): entry is string => typeof entry === "string");
    }
  }
  return result;
}

/** POSTs form values to the site-origin records API. */
export async function submitFormToApi(
  resource: string,
  values: Readonly<Record<string, unknown>>,
  formElement?: HTMLFormElement | null,
): Promise<SubmitFormResult> {
  const payload: Record<string, unknown> = { ...values };

  if (formElement) {
    const formData = new FormData(formElement);
    for (const [key, entry] of formData.entries()) {
      if (!(key in payload)) {
        payload[key] = entry;
      }
    }
  }

  const response = await fetch(`/api/records/${encodeURIComponent(resource)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 204 || response.status === 201) {
    return { ok: true };
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfter ? Number.parseInt(retryAfter, 10) : 60;
    return {
      ok: false,
      rateLimited: true,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 60,
      error: "Rate limit exceeded.",
    };
  }

  if (response.status === 400) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, error: "Validation failed." };
    }
    const fieldErrors =
      typeof body === "object" && body !== null
        ? parseFieldErrors((body as { details?: unknown }).details)
        : undefined;
    return { ok: false, fieldErrors, error: "Validation failed." };
  }

  return { ok: false, error: "Submission failed." };
}
