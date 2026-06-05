import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReceiptData } from "@/lib/receipt";
import { renderReceipt } from "@/lib/receipt-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const data = await getReceiptData(supabase, params.id);
  if (!data) return new Response("Receipt not found", { status: 404 });

  const pdf = await renderReceipt(data);
  return new Response(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.receiptNumber}.pdf"`,
    },
  });
}
