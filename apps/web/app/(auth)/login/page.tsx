import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { invited?: string };
}) {
  return <LoginForm invited={Boolean(searchParams.invited)} />;
}
