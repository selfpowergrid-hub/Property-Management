import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Find a home — LogiQ Estates Pro",
  description: "Browse vacant rental units and book a viewing.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/listings" aria-label="LogiQ Estates Pro">
            <BrandLogo className="h-9 w-auto" />
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Manage / Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} LogiQ Estates Pro · Rental listings
        </div>
      </footer>
    </div>
  );
}
