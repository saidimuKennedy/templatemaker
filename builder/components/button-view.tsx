import type { CSSProperties, MouseEventHandler } from "react";

/**
 * Shared Button markup, used by both the server renderer (`button.tsx`) and
 * the client renderer (`button-client.tsx`).
 *
 * This module carries no "use client" directive on purpose: it compiles as
 * server code when imported from the server renderer and as client code when
 * imported from the client one, so an events-free Button still ships no
 * JavaScript (ADR-012 §3).
 */
export type ButtonViewProps = {
  readonly id: string;
  readonly label: string;
  readonly href?: string;
  readonly style?: CSSProperties;
  readonly onClick?: MouseEventHandler<HTMLElement>;
};

export function ButtonView({ id, label, href, style, onClick }: ButtonViewProps) {
  if (href) {
    return (
      <a
        data-node-type="Button"
        data-node-id={id}
        href={href}
        role="button"
        style={style}
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      data-node-type="Button"
      data-node-id={id}
      style={style}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** Normalises the props bag into ButtonView's typed inputs. */
export function readButtonProps(
  id: string,
  props: Record<string, unknown>,
): Omit<ButtonViewProps, "onClick"> {
  return {
    id,
    label: typeof props.label === "string" ? props.label : "Button",
    href:
      typeof props.href === "string" && props.href.length > 0
        ? props.href
        : undefined,
    style: props.style as CSSProperties | undefined,
  };
}
