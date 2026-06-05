"use client";

import { useRef } from "react";
import { UNIT_STATUSES, enumLabel, type UnitStatus } from "@nyumba360/shared";
import { Select } from "@/components/ui/select";
import { setUnitStatusAction } from "@/app/actions/properties";

/** Inline unit-status changer; auto-submits to the server action on change. */
export function UnitStatusSelect({
  unitId,
  propertyId,
  status,
}: {
  unitId: string;
  propertyId: string;
  status: UnitStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={setUnitStatusAction}>
      <input type="hidden" name="unitId" value={unitId} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <Select
        name="status"
        defaultValue={status}
        className="h-8 w-40 text-xs"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {UNIT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {enumLabel(s)}
          </option>
        ))}
      </Select>
    </form>
  );
}
