import { PlatformChrome } from "@/components/platform-chrome";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformChrome>
      <div className="relative min-h-screen">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        {children}
      </div>
    </PlatformChrome>
  );
}
