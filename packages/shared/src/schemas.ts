import { z } from "zod";
import {
  PROPERTY_TYPES,
  UNIT_STATUSES,
  LEASE_STATUSES,
  PAYMENT_METHODS,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  EXPENSE_CATEGORIES,
} from "./enums";
import { INVITABLE_ROLES } from "./roles";

/**
 * Validation schemas shared by web forms, server actions, and (later) the
 * mobile app. Kept minimal for Phase 1 — the entities the foundation actually
 * writes. Money is validated as a non-negative number.
 */

const kesAmount = z.coerce.number().nonnegative("Amount cannot be negative");
const phoneKE = z
  .string()
  .trim()
  .regex(/^\+?254\d{9}$|^0\d{9}$/u, "Enter a valid Kenyan phone number");

// ── Auth & org bootstrap ────────────────────────────────────────────────────
export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const createOrganisationSchema = z.object({
  name: z.string().trim().min(2, "Organisation name is required"),
  county: z.string().trim().optional(),
});
export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;

export const inviteUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(INVITABLE_ROLES as [string, ...string[]]),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

// Organisation billing settings (PAY-02 Paybill, PAY-06 grace period).
export const orgBillingSchema = z.object({
  // Kenyan Paybill/Till numbers are 5–7 digits; optional until configured.
  mpesaPaybillNumber: z
    .string()
    .trim()
    .regex(/^\d{5,7}$/u, "Paybill number should be 5–7 digits")
    .optional()
    .or(z.literal("")),
  graceDays: z.coerce.number().int().min(0, "Cannot be negative").max(31, "At most 31 days"),
});
export type OrgBillingInput = z.infer<typeof orgBillingSchema>;

// ── Property & unit ─────────────────────────────────────────────────────────
export const propertySchema = z.object({
  name: z.string().trim().min(2, "Property name is required"),
  address: z.string().trim().optional(),
  county: z.string().trim().optional(),
  type: z.enum(PROPERTY_TYPES),
});
export type PropertyInput = z.infer<typeof propertySchema>;

export const unitSchema = z.object({
  propertyId: z.string().uuid(),
  unitNumber: z.string().trim().min(1, "Unit number is required"),
  floor: z.string().trim().optional(),
  type: z.string().trim().optional(),
  sizeSqft: z.coerce.number().positive().optional(),
  monthlyRent: kesAmount,
  status: z.enum(UNIT_STATUSES).default("vacant"),
});
export type UnitInput = z.infer<typeof unitSchema>;

// ── Tenant & lease ──────────────────────────────────────────────────────────
export const ID_DOCUMENT_TYPES = ["national_id", "passport", "alien_id", "military_id"] as const;
export const GENDERS = ["male", "female", "other", "undisclosed"] as const;
export const MARITAL_STATUSES = ["single", "married", "divorced", "widowed"] as const;

const optionalText = z.string().trim().optional().or(z.literal(""));
// KRA PIN: a letter, 9 digits, a trailing letter (e.g. A012345678Z). Optional.
const kraPin = z
  .string()
  .trim()
  .regex(/^[A-Za-z]\d{9}[A-Za-z]$/u, "Enter a valid KRA PIN (e.g. A012345678Z)")
  .optional()
  .or(z.literal(""));

export const tenantSchema = z.object({
  // Identity
  fullName: z.string().trim().min(2, "Tenant name is required"),
  idType: z.enum(ID_DOCUMENT_TYPES).optional().or(z.literal("")),
  nationalId: optionalText,
  dateOfBirth: z.string().date().optional().or(z.literal("")),
  gender: z.enum(GENDERS).optional().or(z.literal("")),
  nationality: optionalText,
  maritalStatus: z.enum(MARITAL_STATUSES).optional().or(z.literal("")),
  kraPin,
  // Contact & address
  phone: phoneKE,
  alternatePhone: phoneKE.optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  postalAddress: optionalText,
  physicalAddress: optionalText,
  // Employment
  occupation: optionalText,
  employer: optionalText,
  // Next of kin / emergency
  emergencyContact: optionalText,
  nextOfKinName: optionalText,
  nextOfKinRelationship: optionalText,
  nextOfKinPhone: phoneKE.optional().or(z.literal("")),
  // Misc
  notes: optionalText,
});
export type TenantInput = z.infer<typeof tenantSchema>;

// One unit allocation = an active lease created alongside the tenant. Mirrors
// leaseSchema's lease terms minus tenantId (the tenant is being created here).
export const unitAllocationSchema = z
  .object({
    unitId: z.string().uuid(),
    startDate: z.string().date(),
    endDate: z.string().date().optional().or(z.literal("")),
    rentAmount: kesAmount,
    deposit: kesAmount.default(0),
    paymentDueDay: z.coerce.number().int().min(1).max(28),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });
export type UnitAllocationInput = z.infer<typeof unitAllocationSchema>;

// Create a tenant plus zero or more unit allocations in one submission.
export const createTenantWithAllocationsSchema = z.object({
  tenant: tenantSchema,
  allocations: z.array(unitAllocationSchema).default([]),
});
export type CreateTenantWithAllocationsInput = z.infer<typeof createTenantWithAllocationsSchema>;

export const leaseSchema = z
  .object({
    unitId: z.string().uuid(),
    tenantId: z.string().uuid(),
    startDate: z.string().date(),
    endDate: z.string().date().optional().or(z.literal("")),
    rentAmount: kesAmount,
    deposit: kesAmount.default(0),
    paymentDueDay: z.coerce.number().int().min(1).max(28),
    status: z.enum(LEASE_STATUSES).default("active"),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });
export type LeaseInput = z.infer<typeof leaseSchema>;

export const renewLeaseSchema = z.object({
  leaseId: z.string().uuid(),
  newEndDate: z.string().date(),
  rentAmount: kesAmount,
  paymentDueDay: z.coerce.number().int().min(1).max(28),
});
export type RenewLeaseInput = z.infer<typeof renewLeaseSchema>;

export const moveOutSchema = z
  .object({
    leaseId: z.string().uuid(),
    noticeDate: z.string().date(),
    vacateDate: z.string().date(),
    depositDeductions: kesAmount.default(0),
    notes: z.string().trim().optional(),
  })
  .refine((v) => v.vacateDate >= v.noticeDate, {
    message: "Vacate date must be on or after the notice date",
    path: ["vacateDate"],
  });
export type MoveOutInput = z.infer<typeof moveOutSchema>;

// ── Rent collection (PAY-01/02) ─────────────────────────────────────────────
export const paymentSchema = z
  .object({
    leaseId: z.string().uuid(),
    amount: z.coerce.number().positive("Amount must be greater than zero"),
    paymentDate: z.string().date(),
    method: z.enum(PAYMENT_METHODS),
    mpesaCode: z.string().trim().optional(),
    bankRef: z.string().trim().optional(),
    payerName: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.method === "mpesa_paybill" && !v.mpesaCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mpesaCode"], message: "M-Pesa transaction code is required" });
    }
    if (v.method === "bank_transfer" && !v.bankRef) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankRef"], message: "Bank reference is required" });
    }
  });
export type PaymentInput = z.infer<typeof paymentSchema>;

// ── Document upload (PROP-05) ───────────────────────────────────────────────
export const DOCUMENT_OWNER_TYPES = ["property", "unit", "lease", "maintenance"] as const;
export const documentMetaSchema = z.object({
  ownerType: z.enum(DOCUMENT_OWNER_TYPES),
  ownerId: z.string().uuid(),
  bucket: z.enum(["property-photos", "lease-documents", "payment-receipts", "maintenance-photos"]),
});
export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;

// ── Maintenance (PRD §6.6) ──────────────────────────────────────────────────
export const maintenanceSubmitSchema = z.object({
  category: z.string().trim().min(2, "Category is required"),
  description: z.string().trim().min(3, "Describe the issue"),
});
export type MaintenanceSubmitInput = z.infer<typeof maintenanceSubmitSchema>;

export const maintenanceStaffCreateSchema = z.object({
  unitId: z.string().uuid(),
  tenantId: z.string().uuid().optional().or(z.literal("")),
  category: z.string().trim().min(2, "Category is required"),
  description: z.string().trim().min(3, "Describe the issue"),
  priority: z.enum(MAINTENANCE_PRIORITIES).default("medium"),
});
export type MaintenanceStaffCreateInput = z.infer<typeof maintenanceStaffCreateSchema>;

export const assignMaintenanceSchema = z.object({
  requestId: z.string().uuid(),
  assignedTo: z.string().uuid(),
  priority: z.enum(MAINTENANCE_PRIORITIES),
});
export type AssignMaintenanceInput = z.infer<typeof assignMaintenanceSchema>;

export const updateMaintenanceStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(MAINTENANCE_STATUSES),
});
export type UpdateMaintenanceStatusInput = z.infer<typeof updateMaintenanceStatusSchema>;

export const resolveMaintenanceSchema = z.object({
  requestId: z.string().uuid(),
  resolutionNotes: z.string().trim().optional(),
  cost: kesAmount.default(0),
});
export type ResolveMaintenanceInput = z.infer<typeof resolveMaintenanceSchema>;

// ── Expenses (PRD §6.7) ─────────────────────────────────────────────────────
export const expenseSchema = z.object({
  propertyId: z.string().uuid(),
  unitId: z.string().uuid().optional().or(z.literal("")),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  date: z.string().date(),
  description: z.string().trim().optional(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

// ── Vacancy: listings & inquiries (PRD §6.5) ────────────────────────────────
export const unitListingSchema = z.object({
  unitId: z.string().uuid(),
  listed: z.coerce.boolean(),
  listingDescription: z.string().trim().optional(),
});
export type UnitListingInput = z.infer<typeof unitListingSchema>;

export const inquirySchema = z.object({
  unitId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Name is required"),
  phone: phoneKE,
  preferredMoveIn: z.string().date().optional().or(z.literal("")),
  message: z.string().trim().optional(),
});
export type InquiryInput = z.infer<typeof inquirySchema>;
