"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@nyumba360/shared";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * Mobile navigation drawer. The desktop sidebar is hidden below `md`, so this
 * hamburger + slide-in sheet is the only way to navigate on phones. Closes on
 * route change and locks body scroll while open.
 */
export function MobileNav({
  nav,
  home,
  orgName,
  userName,
  roleLabel,
  logoUrl,
}: {
  nav: NavItem[];
  home: string;
  orgName: string;
  userName: string;
  roleLabel: string;
  logoUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the route changes (a nav item was tapped).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent the page behind the drawer from scrolling.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-r bg-card px-4 py-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between px-2">
              <Link href={home} className="flex items-center gap-2">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={orgName} className="h-9 w-9 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground">
                    {orgName.charAt(0).toUpperCase() || "L"}
                  </span>
                )}
                <div className="leading-tight">
                  <p className="font-serif text-sm font-semibold">{orgName}</p>
                  <p className="truncate text-xs text-muted-foreground">LogiQ Estates Pro</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {nav.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
            </nav>

            <div className="mt-4 border-t pt-4">
              <div className="px-3 pb-2">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <SignOutButton />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
