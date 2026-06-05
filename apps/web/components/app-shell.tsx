import Link from "next/link";
import { navForRole, ROLE_LABELS, type UserRole } from "@nyumba360/shared";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";

interface AppShellProps {
  role: UserRole;
  orgName: string;
  userName: string;
  children: React.ReactNode;
}

/** Sidebar + topbar layout shared by the staff app and the tenant portal.
 *  Nav is derived from the role via the shared permissions matrix. */
export function AppShell({ role, orgName, userName, children }: AppShellProps) {
  const nav = navForRole(role);
  const home = role === "tenant" ? "/portal" : "/dashboard";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card px-4 py-6 md:flex">
        <Link href={home} className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground">
            N
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Nyumba360</p>
            <p className="truncate text-xs text-muted-foreground">{orgName}</p>
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

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-6 py-3 md:hidden">
          <Link href={home} className="font-semibold">
            Nyumba360
          </Link>
          <span className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</span>
        </header>
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
