import type { UserRole } from "./roles";

/**
 * Feature permissions — the single typed source of truth for the PRD §8
 * "Roles & Permissions Matrix". The web nav, route guards, and (later) the
 * mobile app all read from here so the matrix is defined exactly once.
 */
export const FEATURES = [
  "properties.manage", // Create/edit properties & units
  "dashboard.viewAll", // View all-properties dashboard
  "tenants.manage", // Manage tenants & leases
  "payments.record", // Record payments
  "payments.viewAll", // View payment history (all tenants)
  "payments.viewOwn", // Track own payments & receipts
  "maintenance.submit", // Submit a maintenance request
  "maintenance.manage", // Assign & manage maintenance
  "expenses.record", // Record expenses
  "reports.view", // View reports
  "users.manage", // Manage users & roles
  "data.export", // Export data (CSV/PDF)
] as const;

export type Feature = (typeof FEATURES)[number];

type Matrix = Record<Feature, UserRole[]>;

/** Which roles are granted each feature (PRD §8). "caretaker (own)" maintenance
 *  is enforced row-level by RLS; at the feature level the caretaker simply has
 *  maintenance.manage. */
export const PERMISSION_MATRIX: Matrix = {
  "properties.manage": ["landlord", "manager"],
  "dashboard.viewAll": ["landlord", "manager", "accountant"],
  "tenants.manage": ["landlord", "manager"],
  "payments.record": ["landlord", "manager", "caretaker", "accountant"],
  "payments.viewAll": ["landlord", "manager", "accountant"],
  "payments.viewOwn": ["tenant"],
  "maintenance.submit": ["tenant"],
  "maintenance.manage": ["landlord", "manager", "caretaker"],
  "expenses.record": ["landlord", "manager", "accountant"],
  "reports.view": ["landlord", "manager", "accountant"],
  "users.manage": ["landlord"],
  "data.export": ["landlord", "manager", "accountant"],
};

export function can(role: UserRole, feature: Feature): boolean {
  return PERMISSION_MATRIX[feature].includes(role);
}
