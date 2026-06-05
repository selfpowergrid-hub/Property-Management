"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function presetRange(preset: "week" | "month" | "quarter" | "year"): { from: string; to: string } {
  const now = new Date();
  const to = iso(now);
  const start = new Date(now);
  if (preset === "week") start.setDate(now.getDate() - 6);
  else if (preset === "month") start.setMonth(now.getMonth() - 1);
  else if (preset === "quarter") start.setMonth(now.getMonth() - 3);
  else start.setFullYear(now.getFullYear(), 0, 1);
  return { from: iso(start), to };
}

/** Date-range filter for reports (RPT-07): presets + custom range. Drives the
 *  ?from=&to= query params the report server component reads. */
export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function apply(next: { from: string; to: string }) {
    const sp = new URLSearchParams(params.toString());
    sp.set("from", next.from);
    sp.set("to", next.to);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      {(["week", "month", "quarter", "year"] as const).map((p) => (
        <Button key={p} variant="outline" size="sm" onClick={() => apply(presetRange(p))}>
          {p === "week" ? "This week" : p === "month" ? "Last month" : p === "quarter" ? "Last quarter" : "Year to date"}
        </Button>
      ))}
      <form
        action={(fd) => apply({ from: String(fd.get("from")), to: String(fd.get("to")) })}
        className="flex items-end gap-2"
      >
        <Input type="date" name="from" defaultValue={from} className="h-9 w-auto" />
        <Input type="date" name="to" defaultValue={to} className="h-9 w-auto" />
        <Button type="submit" variant="secondary" size="sm">
          Apply
        </Button>
      </form>
    </div>
  );
}
