"use client";

import type { PortfolioData } from "@/lib/schema";
import { TEMPLATE_REGISTRY } from "@/components/templates";

type PreviewPaneProps = {
  data: PortfolioData;
  templateId: string;
};

export function PreviewPane({ data, templateId }: PreviewPaneProps) {
  const Template =
    TEMPLATE_REGISTRY[templateId] ?? TEMPLATE_REGISTRY.executive;

  return (
    <div className="h-full overflow-hidden rounded-lg border border-border bg-muted/30">
      <div
        className="overflow-hidden"
        style={{ height: "calc(1024px * 0.58 + 24px)" }}
      >
        <div
          style={{
            width: "1024px",
            transform: "scale(0.58)",
            transformOrigin: "top left",
          }}
        >
          <Template data={data} />
        </div>
      </div>
    </div>
  );
}
