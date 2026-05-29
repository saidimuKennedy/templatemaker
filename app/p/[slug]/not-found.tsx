import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PortfolioNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Portfolio not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This portfolio may be unpublished, deleted, or the link is incorrect.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
