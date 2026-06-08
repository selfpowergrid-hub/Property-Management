"use client";

import { useRef } from "react";
import { STAFF_ROLES, ROLE_LABELS, type UserRole } from "@nyumba360/shared";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateUserRoleAction, removeUserAction } from "@/app/actions/users";

/** Inline role changer + remove for a staff member (landlord view). */
export function MemberActions({ userId, role, name }: { userId: string; role: UserRole; name: string }) {
  const roleForm = useRef<HTMLFormElement>(null);
  return (
    <div className="flex items-center gap-2">
      <form ref={roleForm} action={updateUserRoleAction}>
        <input type="hidden" name="userId" value={userId} />
        <Select
          name="role"
          defaultValue={role}
          className="h-8 w-40 text-xs"
          onChange={() => roleForm.current?.requestSubmit()}
        >
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </form>
      <form
        action={removeUserAction}
        onSubmit={(e) => {
          if (!confirm(`Remove ${name}? They will lose access immediately.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" variant="outline" size="sm">
          Remove
        </Button>
      </form>
    </div>
  );
}
