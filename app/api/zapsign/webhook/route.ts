import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import type { AssinaturaStatus } from "@/lib/types";

interface ZapSignWebhookSigner {
  token: string;
  name: string;
  email: string;
  status: string;
}

interface ZapSignWebhookPayload {
  token: string;
  status: string;
  signers?: ZapSignWebhookSigner[];
}

const STATUS_MAP: Record<string, AssinaturaStatus> = {
  signed: "assinado",
  pending: "aguardando",
  refused: "recusado",
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ZapSignWebhookPayload;
    const { token, status } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Missing document token" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Find the contrato associated with this ZapSign document
    const { data: contrato, error: findError } = await supabase
      .from("contratos")
      .select("id")
      .eq("zapsign_id", token)
      .single();

    if (findError || !contrato) {
      // Return 200 so ZapSign does not keep retrying for unknown documents
      return NextResponse.json({ received: true });
    }

    const mappedStatus: AssinaturaStatus =
      STATUS_MAP[status] ?? "aguardando";

    const { error: updateError } = await supabase
      .from("contratos")
      .update({ assinatura_status: mappedStatus })
      .eq("id", contrato.id);

    if (updateError) {
      console.error("ZapSign webhook: failed to update contrato:", updateError);
      return NextResponse.json(
        { error: "Failed to update contrato" },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("POST /api/zapsign/webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
