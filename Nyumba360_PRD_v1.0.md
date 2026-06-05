# NYUMBA360
## Property & Rent Management SaaS
### Product Requirements Document — Version 1.0

| Field | Details |
|-------|---------|
| **Product** | Nyumba360 — Multi-tenant Property Management SaaS |
| **Version** | 1.0 (MVP) |
| **Author** | Total Man Technologies |
| **Date** | June 2026 |
| **Status** | Draft — Awaiting Client Approval |
| **Stack** | Next.js · React Native · Supabase · Africa's Talking |

---

## 1. Executive Summary

Nyumba360 is a cloud-based, multi-tenant property and rent management SaaS platform built for the Kenyan market. It enables property owners, managers, caretakers, and accountants to manage residential, commercial, and mixed-use properties from a single dashboard — while giving tenants a self-service web portal and mobile app to view statements, submit maintenance requests, and track payments.

The platform is designed to serve multiple landlords as independent tenants on one infrastructure, making it commercially viable as a subscription SaaS product. All transactions are denominated in KES, and rent collection is handled via M-Pesa Paybill and bank transfer, with Africa's Talking powering SMS notifications.

---

## 2. Problem Statement

Property management in Kenya is predominantly manual — landlords and agents rely on WhatsApp, handwritten ledgers, and spreadsheets to track rent, leases, and maintenance. This creates:

- Late payment cycles and missed rent follow-ups
- No centralised record of tenant history, lease terms, or payment receipts
- Maintenance requests lost in WhatsApp threads with no accountability
- Vacancy tracking done verbally, leading to lost revenue
- Accountants reconciling M-Pesa statements manually against tenant ledgers
- Landlords with multiple properties having no consolidated financial view

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

- Launch a commercially deployable SaaS with subscription-based monetisation
- Serve 4–20 properties and 50–300 units per landlord account at MVP
- Achieve zero paper dependency for rent collection, receipting, and lease management
- Support onboarding of 10 paying landlord accounts within 3 months of launch

### 3.2 Key Success Metrics

| Metric | Target (6 Months Post-Launch) |
|--------|-------------------------------|
| Landlord accounts onboarded | 10+ |
| Units under management | 300+ |
| Rent collection rate (digital) | ≥ 80% of invoiced rent collected on-platform |
| Maintenance request resolution time | ≤ 3 days average |
| Tenant portal adoption | ≥ 60% of tenants active on portal/app |
| SMS delivery rate (Africa's Talking) | ≥ 95% |
| System uptime | ≥ 99.5% |

---

## 4. User Personas

| Persona | Role | Key Needs | Pain Points |
|---------|------|-----------|-------------|
| John Mwangi | Landlord / Property Owner | Consolidated rent dashboard, financial reports, vacancy overview | No single view of all properties; reconciling M-Pesa manually |
| Grace Ochieng | Property Manager / Caretaker | Unit management, move-in/out, maintenance job tracking | Managing tenant complaints via WhatsApp; no paper trail |
| Kevin Kariuki | Tenant | View balance, download receipt, raise maintenance request | No official receipts; chasing caretaker for balance info |
| Atieno Otieno | Accountant / Finance Staff | Expense tracking, income reports, VAT-ready exports | Manual ledger reconciliation; no audit trail |

---

## 5. Scope

### 5.1 In Scope (V1 MVP)

- Multi-tenant SaaS architecture (one Supabase instance, Row-Level Security per organisation)
- Property & unit management (residential, commercial, mixed-use)
- Tenant & lease management
- Rent collection & receipting (M-Pesa Paybill + bank transfer — manual entry)
- Vacancy & unit listings
- Maintenance / repair request tracking
- Expense tracking
- Reports & financial summaries
- SMS notifications via Africa's Talking
- Tenant self-service web portal (Next.js)
- Tenant mobile app (React Native / Expo)
- Role-based access control (Landlord, Manager, Caretaker, Accountant, Tenant)

### 5.2 Out of Scope (V1)

- M-Pesa STK Push / Daraja API automated payments (planned V2)
- WhatsApp Cloud API notifications (planned V2)
- Online property listings / marketplace
- In-app document e-signing
- Utility billing (water, electricity)
- Multi-currency support

---

## 6. Functional Requirements

### 6.1 Authentication & Multi-Tenancy

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| AUTH-01 | User registration with email + password; OTP verification via Africa's Talking SMS | Must Have |
| AUTH-02 | Role-based login: Landlord, Property Manager, Caretaker, Accountant, Tenant | Must Have |
| AUTH-03 | Each organisation (landlord account) is a separate Supabase RLS tenant; data fully isolated | Must Have |
| AUTH-04 | Landlord can invite users (manager, accountant) by email and assign roles | Must Have |
| AUTH-05 | Tenant accounts are auto-created on lease activation; credentials sent via SMS | Must Have |
| AUTH-06 | Password reset via SMS OTP | Must Have |

### 6.2 Property & Unit Management

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| PROP-01 | Landlord can create and manage multiple properties (name, location, type: residential/commercial/mixed) | Must Have |
| PROP-02 | Each property has multiple units (unit number, floor, type, size sqft, monthly rent in KES) | Must Have |
| PROP-03 | Unit status tracked: Occupied, Vacant, Under Maintenance, Reserved | Must Have |
| PROP-04 | Dashboard card per property showing occupancy rate, collected rent, outstanding balance | Must Have |
| PROP-05 | Attach photos and documents (lease agreements, title deed) to property/unit records | Should Have |
| PROP-06 | Bulk unit import via CSV template | Nice to Have |

### 6.3 Tenant & Lease Management

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| TEN-01 | Create tenant profile: full name, national ID, phone, email, emergency contact | Must Have |
| TEN-02 | Create lease: linked unit, start date, end date, rent amount, deposit amount, payment due day | Must Have |
| TEN-03 | System auto-generates monthly rent invoices on the configured due day | Must Have |
| TEN-04 | Lease renewal workflow: manager can extend lease with updated terms | Must Have |
| TEN-05 | Move-out workflow: record notice date, vacate date, deposit deductions, refund balance | Must Have |
| TEN-06 | Tenant history: full ledger of all payments, invoices, and maintenance requests | Must Have |
| TEN-07 | Multiple tenants per unit (e.g. commercial sub-tenants) — flag per unit | Should Have |

### 6.4 Rent Collection & Receipting

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| PAY-01 | Manager/caretaker records a payment manually: tenant, amount, date, method (M-Pesa Paybill, Bank Transfer, Cash) | Must Have |
| PAY-02 | For M-Pesa Paybill: record Paybill number, account reference (unit number), M-Pesa transaction code, payer name | Must Have |
| PAY-03 | System auto-allocates payment to oldest outstanding invoice first (FIFO) | Must Have |
| PAY-04 | Generate and display PDF receipt per payment; tenant can download from portal | Must Have |
| PAY-05 | Outstanding balance computed automatically after each payment | Must Have |
| PAY-06 | Late payment flag if payment recorded after invoice due date; configurable grace period | Must Have |
| PAY-07 | SMS notification to tenant on payment receipt confirmation | Must Have |
| PAY-08 | Partial payments allowed and tracked; balance carried forward | Must Have |

### 6.5 Vacancy & Unit Listings

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| VAC-01 | Vacancy dashboard: list of all vacant units with type, size, rent, and days vacant | Must Have |
| VAC-02 | Manager can flag a unit as 'available for listing' with description and photos | Must Have |
| VAC-03 | Prospective tenant inquiry form (name, phone, preferred move-in date) linked to a unit | Should Have |
| VAC-04 | Vacancy report exportable to PDF/CSV | Should Have |

### 6.6 Maintenance & Repair Requests

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| MNT-01 | Tenant submits maintenance request from portal/app: category, description, photo attachment | Must Have |
| MNT-02 | Manager receives SMS notification on new request | Must Have |
| MNT-03 | Manager assigns request to caretaker and sets priority (Low / Medium / Urgent) | Must Have |
| MNT-04 | Status tracking: New → Assigned → In Progress → Resolved → Closed | Must Have |
| MNT-05 | Caretaker updates status from mobile app; tenant notified via SMS on status change | Must Have |
| MNT-06 | Resolution notes and cost recorded on closure; cost linked to expense module | Must Have |
| MNT-07 | Manager can create maintenance requests on behalf of tenant (e.g. on-site inspection) | Must Have |
| MNT-08 | Maintenance history exportable per unit | Should Have |

### 6.7 Expense Tracking

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| EXP-01 | Record property expenses: category (repairs, utilities, insurance, agent fees, other), amount, date, description, receipt upload | Must Have |
| EXP-02 | Expenses linked to a specific property or unit | Must Have |
| EXP-03 | Maintenance resolution costs auto-populated as expense on ticket closure | Should Have |
| EXP-04 | Monthly and annual expense totals per property in the financial dashboard | Must Have |
| EXP-05 | Export expenses to CSV for accountant use | Must Have |

### 6.8 Reports & Financial Summaries

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| RPT-01 | Rent Collection Report: invoiced vs collected vs outstanding per property/month | Must Have |
| RPT-02 | Income & Expense Summary: gross income, total expenses, net income per period | Must Have |
| RPT-03 | Tenant Arrears Report: list of tenants with outstanding balances and aging | Must Have |
| RPT-04 | Occupancy Report: occupancy rate per property over time | Must Have |
| RPT-05 | Maintenance Summary Report: open/closed tickets, average resolution time, cost | Should Have |
| RPT-06 | All reports exportable as PDF and CSV | Must Have |
| RPT-07 | Date range filter (weekly, monthly, quarterly, custom) on all reports | Must Have |

### 6.9 SMS Notifications (Africa's Talking)

| Trigger | Recipient | Message Content |
|---------|-----------|-----------------|
| Rent invoice generated | Tenant | Invoice amount, due date, M-Pesa Paybill details |
| Payment recorded | Tenant | Amount received, receipt number, balance (if any) |
| Payment overdue (configurable days after due) | Tenant | Outstanding amount, days overdue |
| Maintenance request received | Manager | Unit, request category, urgency |
| Maintenance status updated | Tenant | New status, expected resolution (if set) |
| Lease expiring in 60 / 30 days | Tenant + Manager | Expiry date, renewal prompt |
| Move-out confirmation | Tenant | Move-out date, deposit refund status |
| New tenant account created | Tenant | Portal login link, temporary password |

---

## 7. Tenant Self-Service Portal & Mobile App

### 7.1 Web Portal (Next.js)

- Login with phone number + SMS OTP
- Dashboard: current balance, next invoice due date, unit details
- Payment history with downloadable PDF receipts
- Submit and track maintenance requests
- Lease summary: start date, end date, monthly rent, deposit paid
- Download lease agreement PDF
- Profile management: update contact details, emergency contact

### 7.2 Mobile App (React Native / Expo)

- Available on Android (primary) and iOS
- All features of the web portal
- Push notifications for payment reminders and maintenance updates (Expo Notifications)
- Camera integration for maintenance request photo uploads
- Offline-friendly: cached balance and history viewable without internet

---

## 8. Roles & Permissions Matrix

| Feature | Landlord | Manager | Caretaker | Accountant | Tenant |
|---------|----------|---------|-----------|------------|--------|
| Create/edit properties & units | ✓ | ✓ | ✗ | ✗ | ✗ |
| View all properties dashboard | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage tenants & leases | ✓ | ✓ | ✗ | ✗ | ✗ |
| Record payments | ✓ | ✓ | ✓ | ✓ | ✗ |
| View payment history (all tenants) | ✓ | ✓ | ✗ | ✓ | ✗ |
| Track own payments & receipts | ✗ | ✗ | ✗ | ✗ | ✓ |
| Submit maintenance request | ✗ | ✗ | ✗ | ✗ | ✓ |
| Assign & manage maintenance | ✓ | ✓ | ✓ (own) | ✗ | ✗ |
| Record expenses | ✓ | ✓ | ✗ | ✓ | ✗ |
| View reports | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage users & roles | ✓ | ✗ | ✗ | ✗ | ✗ |
| Export data (CSV/PDF) | ✓ | ✓ | ✗ | ✓ | ✗ |

---

## 9. Technical Architecture

### 9.1 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Web Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui | SSR for fast load, SEO-ready tenant portal, consistent design system |
| Mobile App | React Native (Expo SDK 51) | Shared codebase for Android and iOS; Expo Go for rapid testing |
| Backend / Database | Supabase (PostgreSQL + RLS + Auth + Storage + Edge Functions) | Multi-tenancy via RLS, real-time subscriptions, built-in storage for documents |
| SMS Notifications | Africa's Talking SMS API | Kenya-based, CA-compliant, free Sender ID, M-Pesa top-up |
| PDF Generation | Puppeteer / React-PDF (server-side Edge Function) | Generate rent receipts and reports server-side |
| File Storage | Supabase Storage (S3-compatible) | Lease docs, receipts, maintenance photos, expense receipts |
| Hosting | Vercel (Next.js) + Expo EAS (mobile builds) | Automatic CI/CD, edge CDN, Kenya-fast delivery |
| Auth | Supabase Auth + custom role claims (JWT) | Row-Level Security tied to org_id claim in JWT |

### 9.2 Multi-Tenancy Model

Every database table includes an `org_id` column. Supabase RLS policies ensure all queries automatically filter by the authenticated user's `org_id` claim. This provides:

- Complete data isolation between landlord accounts
- No cross-tenant data leakage at the database layer
- Single Supabase project serving all tenants (cost-efficient)
- Tenant (renter) accounts also scoped to an `org_id` and further restricted by unit/lease linkage

### 9.3 Core Database Tables

| Table | Key Fields |
|-------|------------|
| `organisations` | id, name, plan, subscription_status, created_at |
| `users` | id, org_id, email, phone, role, full_name |
| `properties` | id, org_id, name, address, county, type (residential/commercial/mixed) |
| `units` | id, property_id, org_id, unit_number, type, size_sqft, monthly_rent, status |
| `tenants` | id, org_id, full_name, phone, email, national_id, emergency_contact |
| `leases` | id, org_id, unit_id, tenant_id, start_date, end_date, rent_amount, deposit, payment_due_day, status |
| `invoices` | id, org_id, lease_id, amount, due_date, status (unpaid/partial/paid/overdue) |
| `payments` | id, org_id, invoice_id, amount, payment_date, method, mpesa_code, bank_ref, receipt_number |
| `maintenance_requests` | id, org_id, unit_id, tenant_id, category, description, status, priority, assigned_to, resolved_at, cost |
| `expenses` | id, org_id, property_id, unit_id, category, amount, date, description, receipt_url |
| `sms_logs` | id, org_id, recipient_phone, message, status, at_message_id, sent_at |

---

## 10. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Dashboard page load < 2 seconds on 4G (Nairobi average). Database queries optimised with indexes on org_id, lease_id, and invoice due_date. |
| Security | All data encrypted at rest (Supabase default AES-256). HTTPS enforced. JWT tokens expire after 24 hours. PII (national ID, phone) accessible only to authorised roles. |
| Scalability | Architecture supports 500+ landlord organisations on a single Supabase instance before sharding is needed. Supabase Pro plan handles up to 100k MAU. |
| Availability | Target 99.5% uptime. Vercel + Supabase Pro SLAs meet this threshold. |
| Data Compliance | Complies with Kenya Data Protection Act 2019. Tenant PII not shared across organisations. Data deletion on account closure within 30 days. |
| Accessibility | Web portal meets WCAG 2.1 AA. Mobile app supports screen reader (TalkBack/VoiceOver). |
| Offline Support | Mobile app caches tenant balance, lease summary, and last 10 payments for offline access via Expo SQLite / AsyncStorage. |
| SMS Reliability | Africa's Talking delivery reports stored in sms_logs. Failed messages retried up to 3 times with exponential backoff. |

---

## 11. Subscription & Monetisation Model

| Plan | Price (KES/month) | Units Limit | Users | Features |
|------|-------------------|-------------|-------|----------|
| Starter | 1,500 | Up to 20 units | 2 users | All core modules, 200 SMS/mo |
| Growth | 4,500 | Up to 100 units | 5 users | All core + reports export, 1,000 SMS/mo |
| Pro | 9,500 | Up to 300 units | Unlimited | All features, priority support, 3,000 SMS/mo |
| Enterprise | Custom | Unlimited | Unlimited | Dedicated onboarding, SLA, custom integrations |

> Africa's Talking SMS costs are passed through at cost above the included bundle. Excess billed at KES 0.80 per SMS.

---

## 12. Development Phases & Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Foundation | Weeks 1–3 | Supabase schema, RLS policies, Auth (roles, invite flow), Next.js app shell, design system, basic routing for all 5 roles |
| Phase 2: Core Modules | Weeks 4–7 | Property & unit management, tenant & lease management, invoice auto-generation, rent collection & receipting (manual entry), PDF receipts |
| Phase 3: Operations | Weeks 8–10 | Maintenance request module (web + mobile), vacancy module, expense tracking, Africa's Talking SMS integration |
| Phase 4: Reporting & Portal | Weeks 11–13 | All reports (PDF + CSV), tenant web portal, React Native mobile app (Android-first), Expo push notifications |
| Phase 5: QA & Launch | Weeks 14–15 | End-to-end testing, UAT with client, Vercel production deployment, EAS mobile build, onboarding documentation, admin seeding scripts |

---

## 13. Assumptions & Dependencies

### 13.1 Assumptions

- Client will provide M-Pesa Paybill credentials and nominated account references for at least one test property during UAT
- Africa's Talking account will be registered and funded before Phase 3 begins
- Mobile app targets Android API 26+ (covers ~97% of Kenyan Android devices)
- Internet connectivity assumed for all payment recording actions; offline is read-only
- Landlords will onboard their own property data or be supported via a CSV import template

### 13.2 External Dependencies

| Service | Provider | Purpose |
|---------|----------|---------|
| SMS Gateway | Africa's Talking | OTP verification, payment notifications, reminders |
| Database & Auth | Supabase | Multi-tenant PostgreSQL, RLS, file storage |
| Web Hosting | Vercel | Next.js deployment, CDN, serverless edge functions |
| Mobile Builds | Expo EAS | Android and iOS .apk / .ipa build pipeline |
| PDF Generation | React-PDF / Puppeteer | Server-side receipt and report generation |

---

## 14. Open Questions & Decisions Pending

| # | Question | Owner | Target Date |
|---|----------|-------|-------------|
| 1 | Should prospective tenant inquiries (VAC-03) be a public-facing page or internal only? | Client | Before Phase 3 |
| 2 | What is the Paybill account number format for unit account references? (e.g. unit number, phone, custom code) | Client | Before Phase 2 |
| 3 | Should the system support partial deposit refunds with deduction line items, or lump-sum refund only? | Client | Before Phase 2 |
| 4 | Is a landlord-facing mobile app needed in V1, or is the web dashboard sufficient? | Client | Before Phase 4 |
| 5 | Should SMS be sent in English only, or support Swahili templates? | Client | Before Phase 3 |
| 6 | Will utility billing (water/electricity) be required in V2? | Client + Dev | V2 Planning |
| 7 | What Supabase plan should be provisioned? (Free tier limits to 500MB DB, 50k MAU) | Dev | Before Phase 1 |

---

## 15. Appendix

### 15.1 Glossary

| Term | Definition |
|------|------------|
| Org / Organisation | A landlord account on Nyumba360 — the top-level multi-tenant unit |
| Unit | An individual rentable space within a property (apartment, shop, office) |
| Lease | A formal rental agreement linking a tenant to a unit for a defined period |
| Invoice | A monthly rent charge auto-generated by the system on the payment due day |
| Receipt | A system-generated PDF document confirming a payment has been recorded |
| RLS | Row-Level Security — Supabase/PostgreSQL feature enforcing per-org data isolation |
| KES | Kenya Shilling — the only supported currency in V1 |
| AT | Africa's Talking — the SMS gateway provider used for all outbound notifications |

### 15.2 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Total Man Technologies | Initial draft based on client discovery session |

---

*Prepared by Total Man Technologies | Eldoret, Kenya*
*This document is confidential. Do not distribute without authorisation.*
