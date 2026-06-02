import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { cancelBoleto } from "@/lib/cora";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boleto_id } = body as { boleto_id: string };

    if (!boleto_id) {
      return NextResponse.json(
        { error: "boleto_id is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: boleto, error: fetchError } = await supabase
      .from("boletos")
      .select("id, cora_id, status")
      .eq("id", boleto_id)
      .single();

    if (fetchError || !boleto) {
      return NextResponse.json({ error: "Boleto not found" }, { status: 404 });
    }

    if (boleto.status === "cancelado") {
      return NextResponse.json(
        { error: "Boleto is already cancelled" },
        { status: 409 }
      );
    }

    if (!boleto.cora_id) {
      return NextResponse.json(
        { error: "Boleto has no Cora ID — cannot cancel" },
        { status: 422 }
      );
    }

    await cancelBoleto(boleto.cora_id);

    const { error: updateError } = await supabase
      .from("boletos")
      .update({ status: "cancelado" })
      .eq("id", boleto_id);

    if (updateError) {
      console.error("Failed to update boleto status after cancellation:", updateError);
      return NextResponse.json(
        { error: "Cancelled on Cora but failed to update database" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/cora/cancelar-boleto error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
