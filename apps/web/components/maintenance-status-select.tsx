"use client";

import { useRef } from "react";
import { MAINTENANCE_STATUSES, enumLabel, type MaintenanceStatus } from "@nyumba360/shared";
import { Select } from "@/components/ui/select";
import { updateMaintenanceStatusAction } from "@/app/actions/maintenance";

/** Inline maintenance status stepper; auto-submits on change (MNT-05). */
export function MaintenanceStatusSelect({
  requestId,
  status,
}: {
  requestId: string;
  status: MaintenanceStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={updateMaintenanceStatusAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <Select
        name="status"
        defaultValue={status}
        className="h-8 w-36 text-xs"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {MAINTENANCE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {enumLabel(s)}
          </option>
        ))}
      </Select>
    </form>
  );
}
