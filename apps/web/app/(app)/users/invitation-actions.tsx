"use client";

import { useState } from "react";
import { revokeInvitationAction } from "@/app/actions/invitations";
import { Button } from "@/components/ui/button";

/** Copy the accept-invite link and revoke a pending invitation. */
export function InvitationActions({ id, link }: { id: string; link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </Button>
      <form
        action={revokeInvitationAction}
        onSubmit={(e) => {
          if (!confirm("Revoke this invitation? The link will stop working.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="outline" size="sm">
          Revoke
        </Button>
      </form>
    </div>
  );
}
