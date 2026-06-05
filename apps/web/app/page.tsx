import { redirect } from "next/navigation";
import { homeRouteForRole } from "@nyumba360/shared";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  if (!isSupabaseConfigured()) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.role || !user.orgId) redirect("/onboarding");
  redirect(homeRouteForRole(user.role));
}
