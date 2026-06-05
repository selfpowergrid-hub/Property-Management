/**
 * User roles (PRD §6.1 AUTH-02, §8). The string values match the Postgres
 * `user_role` enum and the `user_role` JWT claim injected by the access-token
 * hook (supabase/migrations/0004_functions.sql).
 */
export const USER_ROLES = [
  "landlord",
  "manager",
  "caretaker",
  "accountant",
  "tenant",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Non-tenant roles that operate the management dashboard (PRD §8). */
export const STAFF_ROLES: UserRole[] = [
  "landlord",
  "manager",
  "caretaker",
  "accountant",
];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

/** Human-friendly labels for UI. */
export const ROLE_LABELS: Record<UserRole, string> = {
  landlord: "Landlord",
  manager: "Property Manager",
  caretaker: "Caretaker",
  accountant: "Accountant",
  tenant: "Tenant",
};

/** Roles a landlord may invite into their organisation (PRD §6.1 AUTH-04). */
export const INVITABLE_ROLES: UserRole[] = ["manager", "caretaker", "accountant"];
