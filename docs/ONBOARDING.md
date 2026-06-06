# Nyumba360 — Landlord & Staff Onboarding Guide

How to get a property portfolio up and running in Nyumba360 after your account
is provisioned. For deployment/operator steps see
[DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 1. Sign in for the first time

You'll receive a URL, your email, and a temporary password (provisioned by the
operator via the admin seeding script).

1. Go to the URL → **Sign in** with your email and temporary password.
2. As a landlord you land on the **Dashboard**.
3. Change your password from **Profile** (or via *Forgot password?* on the login
   screen).

> **Signing up yourself instead?** A brand-new landlord can use **Create an
> account** on the login page. After signup you're taken through **Onboarding**
> to create your organisation before reaching the dashboard.

---

## 2. Add your properties and units

Navigate via the sidebar (visible items depend on your role).

1. **Properties → Add property** — name, address, county, type (residential /
   commercial / mixed).
2. Open the property → **Add unit** for each rentable unit: unit number, floor,
   type, size, and **monthly rent**. New units start as **vacant**.
3. To advertise an empty unit, mark it **listed** and add a short description —
   it then appears in the **Vacancies** module.

---

## 3. Add tenants and leases

1. **Tenants & Leases → Add tenant** — full name, phone, email, national ID,
   emergency contact.
2. Create a **lease** linking the tenant to a unit: start date, rent amount,
   deposit, and the **payment due day** (1–28). An active lease marks the unit
   **occupied**.
3. Once a lease is active, **monthly rent invoices are generated automatically**
   on the due day. You don't create invoices by hand.

---

## 4. Record payments & issue receipts

1. **Payments → Record payment** — choose the lease/invoice, amount, date, and
   method (M-Pesa Paybill, bank transfer, or cash). Add the M-Pesa code or bank
   reference where relevant.
2. Payments are **allocated oldest-invoice-first**; the invoice status and the
   tenant's outstanding balance update automatically.
3. Each payment has a **downloadable PDF receipt** (the receipt link on the
   payment row). Tenants can download their own receipts from the portal.

---

## 5. Invite your team (staff roles)

Only a **landlord** can invite users. **Users → Invite user** — enter the email
and pick a role:

| Role | Can do |
|------|--------|
| **Landlord** | Everything, incl. inviting users and editing the organisation |
| **Manager** | Properties, tenants/leases, payments, maintenance, expenses, reports |
| **Accountant** | Payments, invoices, expenses, reports |
| **Caretaker** | Maintenance requests assigned to them; record payments |
| **Tenant** | Self-service portal only (their lease, balance, receipts, requests) |

The invitee gets an email link, sets their password via **accept invite**, and
lands in a workspace scoped to their role. Each role only sees the navigation
and data its permissions allow.

---

## 6. Maintenance, vacancies & expenses

- **Maintenance** — staff log and track requests (new → assigned → in progress →
  resolved → closed), assign a caretaker, and record resolution cost. Tenants
  raise requests from their portal/app; closing a request can roll its cost into
  **Expenses**.
- **Vacancies** — lists all vacant/listed units; export to CSV for advertising.
- **Expenses** — record property costs by category (repairs, utilities,
  insurance, agent fees, other); attach receipts. Feeds the financial reports.

---

## 7. Reports

**Reports** offers the standard set (rent roll, collections, arrears, expenses,
occupancy). Filter by date range and **export to PDF or CSV** for sharing with
owners or accountants.

---

## 8. The tenant experience (web portal + Android app)

Tenants sign in to a self-service surface only — they never see other tenants or
landlord data:

- **Home** — current balance and lease summary
- **Payments** — payment history and downloadable receipts
- **Maintenance** — raise a request (with photos) and track its status
- **My Lease** — lease terms and unit details
- **Profile** — contact details and password

The **Android app** (distributed via EAS) mirrors this and adds **push
notifications** for payment confirmations and maintenance updates.

---

## 9. Tips & data hygiene

- **One organisation = one landlord account.** Staff and tenants belong to it;
  data is fully isolated from other organisations (enforced at the database).
- Keep **phone numbers** accurate — SMS reminders and confirmations (Africa's
  Talking) depend on them.
- Set the **payment due day** to match how you bill so auto-generated invoices
  land on the right date.
- Bulk-loading an existing portfolio? Ask your operator about the CSV import
  template (PRD §13.1).
