import Link from "next/link";
import { navForRole, ROLE_LABELS, type UserRole } from "@nyumba360/shared";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import { MobileNav } from "@/components/mobile-nav";

interface AppShellProps {
  role: UserRole;
  orgName: string;
  userName: string;
  logoUrl?: string | null;
  children: React.ReactNode;
}

/** Brand mark — the company logo when set, else the lettered tile. */
function BrandMark({ logoUrl, orgName }: { logoUrl?: string | null; orgName: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={orgName} className="h-9 w-9 shrink-0 rounded-md object-cover" />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground">
      {orgName.charAt(0).toUpperCase() || "L"}
    </span>
  );
}

/** Sidebar + topbar layout shared by the staff app and the tenant portal.
 *  Nav is derived from the role via the shared permissions matrix. */
export function AppShell({ role, orgName, userName, logoUrl, children }: AppShellProps) {
  const nav = navForRole(role);
  const home = role === "tenant" ? "/portal" : "/dashboard";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card px-4 py-6 md:flex">
        <Link href={home} className="mb-8 flex items-center gap-2 px-2">
          <BrandMark logoUrl={logoUrl} orgName={orgName} />
          <div className="leading-tight">
            <p className="font-serif text-sm font-semibold">{orgName}</p>
            <p className="truncate text-xs text-muted-foreground">LogiQ Estates Pro</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>

        <div className="mt-4 border-t pt-4">
          <div className="px-3 pb-2">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-2 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <MobileNav
              nav={nav}
              home={home}
              orgName={orgName}
              userName={userName}
              roleLabel={ROLE_LABELS[role]}
              logoUrl={logoUrl}
            />
            <Link href={home} className="truncate font-serif font-semibold">
              {orgName}
            </Link>
          </div>
          <span className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</span>
        </header>
        <main className="flex-1 bg-background p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
