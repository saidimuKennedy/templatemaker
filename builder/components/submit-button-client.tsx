"use client";

import { useFormContext } from "../runtime/form-context";
import { SubmitButtonView, readSubmitButtonProps } from "./submit-button-view";

export function SubmitButtonClientRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
}) {
  const form = useFormContext();
  const buttonProps = readSubmitButtonProps(id, props);
  const disabled = form.state.submitting || Boolean(form.state.rateLimitMessage);

  return (
    <SubmitButtonView
      {...buttonProps}
      disabled={disabled}
      rateLimitMessage={form.state.rateLimitMessage}
      onClick={() => {
        void form.submit();
      }}
    />
  );
}
