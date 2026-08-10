import type { CSSProperties, MouseEventHandler } from "react";

export type SubmitButtonViewProps = {
  readonly id: string;
  readonly label: string;
  readonly style?: CSSProperties;
  readonly disabled?: boolean;
  readonly rateLimitMessage?: string;
  readonly onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function SubmitButtonView({
  id,
  label,
  style,
  disabled,
  rateLimitMessage,
  onClick,
}: SubmitButtonViewProps) {
  return (
    <div data-node-type="SubmitButton" data-node-id={id}>
      <button type="button" style={style} disabled={disabled} onClick={onClick}>
        {label}
      </button>
      {rateLimitMessage ? (
        <p role="status" style={{ marginTop: "8px", fontSize: "0.875rem", color: "var(--color-muted-foreground, #6b7280)" }}>
          {rateLimitMessage}
        </p>
      ) : null}
    </div>
  );
}

export function readSubmitButtonProps(
  id: string,
  props: Record<string, unknown>,
): Omit<SubmitButtonViewProps, "disabled" | "rateLimitMessage" | "onClick"> {
  return {
    id,
    label: typeof props.label === "string" ? props.label : "Submit",
    style: props.style as CSSProperties | undefined,
  };
}
