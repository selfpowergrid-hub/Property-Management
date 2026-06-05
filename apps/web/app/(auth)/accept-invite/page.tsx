import { AcceptInviteForm } from "./accept-invite-form";

export const dynamic = "force-dynamic";

export default function AcceptInvitePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <AcceptInviteForm token={searchParams.token ?? ""} />;
}
