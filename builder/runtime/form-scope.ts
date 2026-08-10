/** Structured form scope for bindings — ADR-012 §4, Plan 32 Stage 2. */
export type FormScopeState = {
  readonly values: Readonly<Record<string, unknown>>;
  readonly errors: Readonly<Record<string, string | undefined>>;
  readonly submitting: boolean;
  readonly submitted: boolean;
  readonly rateLimitMessage?: string;
};

export function formScopeToBindingScope(state: FormScopeState): Readonly<Record<string, unknown>> {
  return {
    values: state.values,
    errors: state.errors,
    submitting: state.submitting,
    submitted: state.submitted,
  };
}

export function fieldErrorsToFormErrors(
  fieldErrors: Readonly<Record<string, readonly string[]>> | undefined,
): Record<string, string | undefined> {
  if (!fieldErrors) {
    return {};
  }
  const errors: Record<string, string | undefined> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    errors[field] = messages[0];
  }
  return errors;
}
