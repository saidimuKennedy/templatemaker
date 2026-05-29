"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PreviewPane } from "@/components/editor/PreviewPane";
import { WizardShell } from "@/components/editor/WizardShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioDataSchema, type PortfolioData } from "@/lib/schema";

type EditorClientProps = {
  portfolioId: string;
  templateId: string;
  initialData: PortfolioData;
  status: string;
};

export function EditorClient({
  portfolioId,
  templateId,
  initialData,
  status,
}: EditorClientProps) {
  const form = useForm<PortfolioData>({
    resolver: zodResolver(PortfolioDataSchema),
    defaultValues: initialData,
    mode: "onChange",
  });

  const watched = form.watch();

  return (
    <>
      <div className="hidden h-[calc(100vh-8rem)] md:grid md:grid-cols-[2fr_3fr] md:gap-6">
        <WizardShell
          portfolioId={portfolioId}
          control={form.control}
          getValues={form.getValues}
          status={status}
        />
        <PreviewPane data={watched} templateId={templateId} />
      </div>

      <div className="md:hidden">
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-4 min-h-[60vh]">
            <WizardShell
              portfolioId={portfolioId}
              control={form.control}
              getValues={form.getValues}
              status={status}
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <PreviewPane data={watched} templateId={templateId} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
