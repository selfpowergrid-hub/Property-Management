import {
  BarChart3,
  Building2,
  DoorOpen,
  FileText,
  Home,
  LayoutDashboard,
  Receipt,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Map the icon names used in @nyumba360/shared navigation to components. */
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  DoorOpen,
  Wrench,
  Wallet,
  BarChart3,
  ShieldCheck,
  Settings,
  Home,
  FileText,
  User,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? LayoutDashboard;
  return <Cmp className={className} />;
}
