/**
 * Database types for the Nyumba360 schema (supabase/migrations).
 *
 * Hand-authored to match the migrations for Phase 1. Once a real Supabase
 * project exists, regenerate with:
 *   supabase gen types typescript --linked > packages/supabase/src/types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "landlord" | "manager" | "caretaker" | "accountant" | "tenant";
export type SubscriptionPlan = "starter" | "growth" | "pro" | "enterprise";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type PropertyType = "residential" | "commercial" | "mixed";
export type UnitStatus = "occupied" | "vacant" | "under_maintenance" | "reserved";
export type LeaseStatus = "pending" | "active" | "expired" | "terminated";
export type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue";
export type PaymentMethod = "mpesa_paybill" | "bank_transfer" | "cash";
export type MaintenanceStatus = "new" | "assigned" | "in_progress" | "resolved" | "closed";
export type MaintenancePriority = "low" | "medium" | "urgent";
export type ExpenseCategory = "repairs" | "utilities" | "insurance" | "agent_fees" | "other";
export type SmsStatus = "queued" | "sent" | "delivered" | "failed";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

// NOTE: these MUST be `type` aliases, not `interface`s — Supabase's
// GenericSchema constraint requires `Row extends Record<string, unknown>`,
// which object type aliases satisfy but interfaces do not (no index signature).
type Timestamps = { created_at: string; updated_at: string };

type OrganisationRow = Timestamps & {
  id: string;
  name: string;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  county: string | null;
  grace_days: number;
  mpesa_paybill_number: string | null;
  kra_pin: string | null;
  mri_rate: number;
  mri_threshold_min: number;
  mri_threshold_max: number;
  vat_registered: boolean;
  vat_rate: number;
  logo_path: string | null;
  registration_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_address: string | null;
};

export type DocumentOwnerType = "property" | "unit" | "lease" | "maintenance";

type InquiryRow = {
  id: string;
  org_id: string;
  unit_id: string | null;
  name: string;
  phone: string;
  preferred_move_in: string | null;
  message: string | null;
  created_at: string;
};

type PushTokenRow = {
  id: string;
  org_id: string;
  user_id: string;
  token: string;
  platform: string | null;
  created_at: string;
};

type DocumentRow = {
  id: string;
  org_id: string;
  owner_type: DocumentOwnerType;
  owner_id: string;
  bucket: string;
  path: string;
  name: string;
  content_type: string | null;
  uploaded_by: string | null;
  created_at: string;
};

type ReceiptCounterRow = {
  org_id: string;
  last_no: number;
};

type UserRow = Timestamps & {
  id: string;
  org_id: string | null;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: UserRole | null;
};

type PropertyRow = Timestamps & {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  county: string | null;
  type: PropertyType;
};

type UnitRow = Timestamps & {
  id: string;
  org_id: string;
  property_id: string;
  unit_number: string;
  floor: string | null;
  type: string | null;
  size_sqft: number | null;
  monthly_rent: number;
  status: UnitStatus;
  allow_multiple_tenants: boolean;
  listed: boolean;
  listing_description: string | null;
};

export type IdDocumentType = "national_id" | "passport" | "alien_id" | "military_id";

type TenantRow = Timestamps & {
  id: string;
  org_id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  emergency_contact: string | null;
  id_type: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  marital_status: string | null;
  kra_pin: string | null;
  occupation: string | null;
  employer: string | null;
  alternate_phone: string | null;
  postal_address: string | null;
  physical_address: string | null;
  next_of_kin_name: string | null;
  next_of_kin_relationship: string | null;
  next_of_kin_phone: string | null;
  notes: string | null;
};

type LeaseRow = Timestamps & {
  id: string;
  org_id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  deposit: number;
  payment_due_day: number;
  status: LeaseStatus;
  notice_date: string | null;
  vacate_date: string | null;
};

type InvoiceRow = Timestamps & {
  id: string;
  org_id: string;
  lease_id: string;
  amount: number;
  amount_paid: number;
  due_date: string;
  period_month: string;
  status: InvoiceStatus;
};

type PaymentRow = Timestamps & {
  id: string;
  org_id: string;
  lease_id: string | null;
  invoice_id: string | null;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  mpesa_code: string | null;
  bank_ref: string | null;
  payer_name: string | null;
  receipt_number: string | null;
  recorded_by: string | null;
  is_late: boolean;
  wht_amount: number;
};

type MaintenanceRow = Timestamps & {
  id: string;
  org_id: string;
  unit_id: string;
  tenant_id: string | null;
  category: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  assigned_to: string | null;
  resolution_notes: string | null;
  cost: number | null;
  resolved_at: string | null;
};

type ExpenseRow = Timestamps & {
  id: string;
  org_id: string;
  property_id: string;
  unit_id: string | null;
  maintenance_request_id: string | null;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string | null;
  receipt_url: string | null;
};

type SmsLogRow = {
  id: string;
  org_id: string;
  recipient_phone: string;
  message: string;
  status: SmsStatus;
  at_message_id: string | null;
  error: string | null;
  retry_count: number;
  sent_at: string | null;
  created_at: string;
};

type InvitationRow = {
  id: string;
  org_id: string;
  email: string;
  role: UserRole;
  invited_by: string | null;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

/** Public marketplace listing (safe columns returned by the SECURITY DEFINER
 *  functions to the anon role — only listed, vacant units). */
export type PublicListingRow = {
  unit_id: string;
  unit_number: string;
  unit_type: string | null;
  monthly_rent: number;
  listing_description: string | null;
  property_name: string;
  county: string | null;
  property_type: PropertyType;
  company_name: string;
  company_phone: string | null;
  company_email: string | null;
  company_logo_path: string | null;
  photo_path: string | null;
};

export type ListingPhotoRef = { bucket: string; path: string };

/** A foreign-key relationship entry (shape required by postgrest-js to type
 *  embedded `select('child(...)')` resources). All our FKs reference `id`. */
type FK<Col extends string, Ref extends string> = {
  foreignKeyName: string;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

/** Build a table definition where Insert makes generated/defaulted columns
 *  optional and Rel carries the table's foreign keys. */
type Table<Row, Optional extends keyof Row, Rel extends readonly unknown[] = []> = {
  Row: Row;
  Insert: Omit<Row, Optional> & Partial<Pick<Row, Optional>>;
  Update: Partial<Row>;
  Relationships: Rel;
};

export interface Database {
  public: {
    Tables: {
      organisations: Table<
        OrganisationRow,
        | "id"
        | keyof Timestamps
        | "plan"
        | "subscription_status"
        | "county"
        | "grace_days"
        | "mpesa_paybill_number"
        | "kra_pin"
        | "mri_rate"
        | "mri_threshold_min"
        | "mri_threshold_max"
        | "vat_registered"
        | "vat_rate"
        | "logo_path"
        | "registration_number"
        | "phone"
        | "email"
        | "address"
        | "postal_address"
      >;
      documents: Table<
        DocumentRow,
        "id" | "created_at" | "content_type" | "uploaded_by",
        [FK<"org_id", "organisations">]
      >;
      receipt_counters: Table<ReceiptCounterRow, "last_no", [FK<"org_id", "organisations">]>;
      inquiries: Table<
        InquiryRow,
        "id" | "created_at" | "unit_id" | "preferred_move_in" | "message",
        [FK<"org_id", "organisations">, FK<"unit_id", "units">]
      >;
      push_tokens: Table<
        PushTokenRow,
        "id" | "created_at" | "platform",
        [FK<"org_id", "organisations">, FK<"user_id", "users">]
      >;
      users: Table<
        UserRow,
        keyof Timestamps | "org_id" | "email" | "phone" | "full_name" | "role",
        [FK<"org_id", "organisations">]
      >;
      properties: Table<
        PropertyRow,
        "id" | keyof Timestamps | "address" | "county" | "type",
        [FK<"org_id", "organisations">]
      >;
      units: Table<
        UnitRow,
        "id" | keyof Timestamps | "floor" | "type" | "size_sqft" | "monthly_rent" | "status" | "allow_multiple_tenants" | "listed" | "listing_description",
        [FK<"org_id", "organisations">, FK<"property_id", "properties">]
      >;
      tenants: Table<
        TenantRow,
        | "id"
        | keyof Timestamps
        | "user_id"
        | "phone"
        | "email"
        | "national_id"
        | "emergency_contact"
        | "id_type"
        | "date_of_birth"
        | "gender"
        | "nationality"
        | "marital_status"
        | "kra_pin"
        | "occupation"
        | "employer"
        | "alternate_phone"
        | "postal_address"
        | "physical_address"
        | "next_of_kin_name"
        | "next_of_kin_relationship"
        | "next_of_kin_phone"
        | "notes",
        [FK<"org_id", "organisations">, FK<"user_id", "users">]
      >;
      leases: Table<
        LeaseRow,
        "id" | keyof Timestamps | "end_date" | "deposit" | "payment_due_day" | "status" | "notice_date" | "vacate_date",
        [FK<"org_id", "organisations">, FK<"unit_id", "units">, FK<"tenant_id", "tenants">]
      >;
      invoices: Table<
        InvoiceRow,
        "id" | keyof Timestamps | "amount_paid" | "status",
        [FK<"org_id", "organisations">, FK<"lease_id", "leases">]
      >;
      payments: Table<
        PaymentRow,
        "id" | keyof Timestamps | "lease_id" | "invoice_id" | "payment_date" | "mpesa_code" | "bank_ref" | "payer_name" | "receipt_number" | "recorded_by" | "is_late" | "wht_amount",
        [FK<"org_id", "organisations">, FK<"lease_id", "leases">, FK<"invoice_id", "invoices">]
      >;
      maintenance_requests: Table<
        MaintenanceRow,
        "id" | keyof Timestamps | "tenant_id" | "description" | "status" | "priority" | "assigned_to" | "resolution_notes" | "cost" | "resolved_at",
        [FK<"org_id", "organisations">, FK<"unit_id", "units">, FK<"tenant_id", "tenants">, FK<"assigned_to", "users">]
      >;
      expenses: Table<
        ExpenseRow,
        "id" | keyof Timestamps | "unit_id" | "maintenance_request_id" | "category" | "date" | "description" | "receipt_url",
        [FK<"org_id", "organisations">, FK<"property_id", "properties">, FK<"unit_id", "units">, FK<"maintenance_request_id", "maintenance_requests">]
      >;
      sms_logs: Table<
        SmsLogRow,
        "id" | "created_at" | "status" | "at_message_id" | "error" | "retry_count" | "sent_at",
        [FK<"org_id", "organisations">]
      >;
      user_invitations: Table<
        InvitationRow,
        "id" | "created_at" | "status" | "expires_at" | "accepted_at" | "invited_by",
        [FK<"org_id", "organisations">, FK<"invited_by", "users">]
      >;
    };
    Views: Record<string, never>;
    Functions: {
      next_receipt_number: { Args: { p_org: string }; Returns: string };
      refresh_invoice_status: { Args: { p_invoice: string }; Returns: undefined };
      generate_first_invoice: { Args: { p_lease: string }; Returns: undefined };
      generate_due_invoices: { Args: { p_as_of?: string }; Returns: number };
      list_public_listings: {
        Args: { p_county?: string | null; p_type?: string | null; p_max_rent?: number | null };
        Returns: PublicListingRow[];
      };
      get_public_listing: { Args: { p_unit: string }; Returns: PublicListingRow[] };
      get_listing_photos: { Args: { p_unit: string }; Returns: ListingPhotoRef[] };
      submit_public_inquiry: {
        Args: {
          p_unit: string;
          p_name: string;
          p_phone: string;
          p_move_in?: string | null;
          p_message?: string | null;
        };
        Returns: undefined;
      };
    };
    CompositeTypes: Record<string, never>;
    Enums: {
      user_role: UserRole;
      subscription_plan: SubscriptionPlan;
      subscription_status: SubscriptionStatus;
      property_type: PropertyType;
      unit_status: UnitStatus;
      lease_status: LeaseStatus;
      invoice_status: InvoiceStatus;
      payment_method: PaymentMethod;
      maintenance_status: MaintenanceStatus;
      maintenance_priority: MaintenancePriority;
      expense_category: ExpenseCategory;
      sms_status: SmsStatus;
      invitation_status: InvitationStatus;
    };
  };
}

// Convenience row aliases
export type Organisation = OrganisationRow;
export type User = UserRow;
export type Property = PropertyRow;
export type Unit = UnitRow;
export type Tenant = TenantRow;
export type Lease = LeaseRow;
export type Invoice = InvoiceRow;
export type Payment = PaymentRow;
export type MaintenanceRequest = MaintenanceRow;
export type Expense = ExpenseRow;
export type SmsLog = SmsLogRow;
export type Invitation = InvitationRow;
export type DocumentRecord = DocumentRow;
export type Inquiry = InquiryRow;
