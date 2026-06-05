import type { Feature } from "./permissions";
import { can } from "./permissions";
import type { UserRole } from "./roles";

/**
 * Role-aware navigation. Each item declares the feature it requires; the web
 * shell filters this list by the signed-in user's role. Tenants get their own
 * portal nav (the self-service surface, PRD §7).
 */
export interface NavItem {
  label: string;
  href: string;
  /** Required feature; if omitted the item is always shown to staff. */
  feature?: Feature;
  icon: string; // lucide-react icon name, resolved in the web app
}

const STAFF_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Properties", href: "/properties", icon: "Building2", feature: "properties.manage" },
  { label: "Tenants & Leases", href: "/tenants", icon: "Users", feature: "tenants.manage" },
  { label: "Payments", href: "/payments", icon: "Receipt", feature: "payments.record" },
  { label: "Vacancies", href: "/vacancies", icon: "DoorOpen", feature: "properties.manage" },
  { label: "Maintenance", href: "/maintenance", icon: "Wrench", feature: "maintenance.manage" },
  { label: "Expenses", href: "/expenses", icon: "Wallet", feature: "expenses.record" },
  { label: "Reports", href: "/reports", icon: "BarChart3", feature: "reports.view" },
  { label: "Users", href: "/users", icon: "ShieldCheck", feature: "users.manage" },
];

const TENANT_NAV: NavItem[] = [
  { label: "Home", href: "/portal", icon: "Home" },
  { label: "Payments", href: "/portal/payments", icon: "Receipt" },
  { label: "Maintenance", href: "/portal/maintenance", icon: "Wrench" },
  { label: "My Lease", href: "/portal/lease", icon: "FileText" },
  { label: "Profile", href: "/portal/profile", icon: "User" },
];

export function navForRole(role: UserRole): NavItem[] {
  if (role === "tenant") return TENANT_NAV;
  return STAFF_NAV.filter((item) => !item.feature || can(role, item.feature));
}

/** Landing route after login, per role. Tenants go to the portal (PRD §7). */
export function homeRouteForRole(role: UserRole): string {
  return role === "tenant" ? "/portal" : "/dashboard";
}
