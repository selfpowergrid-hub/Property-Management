/**
 * Enum value lists mirroring the Postgres enums in
 * supabase/migrations/0001_enums.sql. Kept in sync by hand (or regenerate the
 * DB types in @nyumba360/supabase). Used for zod validation and UI selects.
 */
export const PROPERTY_TYPES = ["residential", "commercial", "mixed"] as const;
export const UNIT_STATUSES = ["occupied", "vacant", "under_maintenance", "reserved"] as const;
export const LEASE_STATUSES = ["pending", "active", "expired", "terminated"] as const;
export const INVOICE_STATUSES = ["unpaid", "partial", "paid", "overdue"] as const;
export const PAYMENT_METHODS = ["mpesa_paybill", "bank_transfer", "cash"] as const;
export const MAINTENANCE_STATUSES = ["new", "assigned", "in_progress", "resolved", "closed"] as const;
export const MAINTENANCE_PRIORITIES = ["low", "medium", "urgent"] as const;
export const EXPENSE_CATEGORIES = ["repairs", "utilities", "insurance", "agent_fees", "other"] as const;
export const SUBSCRIPTION_PLANS = ["starter", "growth", "pro", "enterprise"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type UnitStatus = (typeof UNIT_STATUSES)[number];
export type LeaseStatus = (typeof LEASE_STATUSES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

const LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  mixed: "Mixed-use",
  occupied: "Occupied",
  vacant: "Vacant",
  under_maintenance: "Under Maintenance",
  reserved: "Reserved",
  pending: "Pending",
  active: "Active",
  expired: "Expired",
  terminated: "Terminated",
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  overdue: "Overdue",
  mpesa_paybill: "M-Pesa Paybill",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  new: "New",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  low: "Low",
  medium: "Medium",
  urgent: "Urgent",
  repairs: "Repairs",
  utilities: "Utilities",
  insurance: "Insurance",
  agent_fees: "Agent Fees",
  other: "Other",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  enterprise: "Enterprise",
};

/** Turn an enum value like "under_maintenance" into "Under Maintenance". */
export function enumLabel(value: string): string {
  return LABELS[value] ?? value;
}
