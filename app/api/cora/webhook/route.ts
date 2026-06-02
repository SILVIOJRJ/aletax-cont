import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import type { BoletoStatus } from "@/lib/types";

interface CoraWebhookPayload {
  id: string;
  status: string;
  [key: string]: unknown;
}

const STATUS_MAP: Record<string, BoletoStatus> = {
  paid: "pago",
  overdue: "vencido",
  canceled: "cancelado",
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CoraWebhookPayload;
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: boleto, error: findError } = await supabase
      .from("boletos")
      .select("id")
      .eq("cora_id", id)
      .single();

    if (findError || !boleto) {
      // Return 200 so Cora does not keep retrying for unknown invoices
      return new NextResponse(null, { status: 200 });
    }

    const mappedStatus: BoletoStatus | undefined = STATUS_MAP[status];

    if (!mappedStatus) {
      // Unknown / unhandled status — acknowledge without updating
      return new NextResponse(null, { status: 200 });
    }

    const { error: updateError } = await supabase
      .from("boletos")
      .update({ status: mappedStatus })
      .eq("id", boleto.id);

    if (updateError) {
      console.error("Cora webhook: failed to update boleto:", updateError);
      return NextResponse.json(
        { error: "Failed to update boleto status" },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error("POST /api/cora/webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
