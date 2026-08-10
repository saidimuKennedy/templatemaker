"use client";

import { FormProvider, useFormContext } from "../runtime/form-context";
import { FormView, readFormProps } from "./form-view";
import type { ResourceDefinition } from "../resources/types";
import { readNodeEvents } from "../runtime/use-node-events";

function FormSubmitBridge({ children }: { readonly children?: React.ReactNode }) {
  const { submit } = useFormContext();

  return (
    <FormView
      {...({} as Parameters<typeof FormView>[0])}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {children}
    </FormView>
  );
}

export function FormClientRenderer({
  id,
  props,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const resources = props._resources as readonly ResourceDefinition[] | undefined;
  const resourceName = typeof props.resource === "string" ? props.resource : "";
  const resourceDefinition = resources?.find((entry) => entry.name === resourceName);
  const formProps = readFormProps(id, props, resourceDefinition);
  const events = readNodeEvents(props);

  return (
    <FormProvider
      formId={id}
      resource={formProps.resource}
      resources={resources}
      onSubmitSteps={events?.onSubmit}
    >
      <FormInner {...formProps}>{children}</FormInner>
    </FormProvider>
  );
}

function FormInner({
  id,
  resource,
  style,
  honeypotField,
  children,
}: Omit<ReturnType<typeof readFormProps>, never> & { readonly children?: React.ReactNode }) {
  const { submit } = useFormContext();

  return (
    <FormView
      id={id}
      resource={resource}
      style={style}
      honeypotField={honeypotField}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {children}
    </FormView>
  );
}
