"use client";

import * as React from "react";
import { PAYMENT_METHODS, enumLabel, formatKES } from "@nyumba360/shared";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form-dialog";

export interface LeaseOption {
  id: string;
  tenantName: string;
  unitNumber: string;
  rent: number;
  balance: number;
}

/**
 * Interactive body for the "Record payment" dialog. Selecting a lease pre-fills
 * the amount with the outstanding balance and surfaces the account reference
 * (unit number) + Paybill (PAY-02). The M-Pesa code / bank reference inputs are
 * shown only for the relevant method.
 */
export function RecordPaymentFields({
  leases,
  paybillNumber,
}: {
  leases: LeaseOption[];
  paybillNumber: string | null;
}) {
  const [leaseId, setLeaseId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<(typeof PAYMENT_METHODS)[number]>("mpesa_paybill");

  const selected = leases.find((l) => l.id === leaseId);

  function onPickLease(id: string) {
    setLeaseId(id);
    const lease = leases.find((l) => l.id === id);
    // Pre-fill with the outstanding balance (fall back to a month's rent).
    if (lease) setAmount(String(lease.balance > 0 ? lease.balance : lease.rent));
  }

  return (
    <>
      <Field label="Lease" htmlFor="leaseId">
        <Select
          id="leaseId"
          name="leaseId"
          required
          value={leaseId}
          onChange={(e) => onPickLease(e.target.value)}
        >
          <option value="" disabled>
            Select an active lease
          </option>
          {leases.map((l) => (
            <option key={l.id} value={l.id}>
              {l.tenantName} · Unit {l.unitNumber} · balance {formatKES(l.balance)}
            </option>
          ))}
        </Select>
      </Field>

      {selected ? (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Outstanding balance</span>
            <span className="font-medium text-foreground">{formatKES(selected.balance)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Account reference</span>
            <span className="font-medium text-foreground">{selected.unitNumber}</span>
          </div>
          {paybillNumber ? (
            <div className="mt-1 flex justify-between">
              <span>Paybill</span>
              <span className="font-medium text-foreground">{paybillNumber}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount (KES)" htmlFor="amount">
          <Input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Date" htmlFor="paymentDate">
          <Input
            id="paymentDate"
            name="paymentDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </Field>
        <Field label="Method" htmlFor="method">
          <Select
            id="method"
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {enumLabel(m)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payer name" htmlFor="payerName">
          <Input id="payerName" name="payerName" defaultValue={selected?.tenantName ?? ""} />
        </Field>
        {method === "mpesa_paybill" ? (
          <Field label="M-Pesa code" htmlFor="mpesaCode" hint="Transaction code from the SMS">
            <Input id="mpesaCode" name="mpesaCode" placeholder="e.g. SLJ7XK21AB" />
          </Field>
        ) : null}
        {method === "bank_transfer" ? (
          <Field label="Bank reference" htmlFor="bankRef">
            <Input id="bankRef" name="bankRef" />
          </Field>
        ) : null}
      </div>
    </>
  );
}
