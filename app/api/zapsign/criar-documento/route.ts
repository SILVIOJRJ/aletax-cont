import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { createDocument } from "@/lib/zapsign";
import type { Contrato, Cliente } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contrato_id } = body as { contrato_id: string };

    if (!contrato_id) {
      return NextResponse.json(
        { error: "contrato_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Fetch contrato with cliente relation
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select("*, cliente:clientes(*)")
      .eq("id", contrato_id)
      .single<Contrato & { cliente: Cliente }>();

    if (contratoError || !contrato) {
      return NextResponse.json(
        { error: "Contrato not found" },
        { status: 404 }
      );
    }

    const cliente = contrato.cliente;

    if (!cliente?.email) {
      return NextResponse.json(
        { error: "Cliente does not have an email address" },
        { status: 422 }
      );
    }

    // TODO: Replace with actual PDF generation using puppeteer or similar.
    // For now we send a placeholder URL. If contrato_html is available you
    // could encode it as a base64 data URI, but ZapSign requires a real PDF.
    const url_pdf =
      process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/contratos/${contrato_id}/pdf`
        : `https://example.com/contratos/${contrato_id}.pdf`;

    const result = await createDocument({
      name: contrato.numero,
      url_pdf,
      signers: [
        {
          name: cliente.razao_social,
          email: cliente.email,
        },
      ],
    });

    // Persist ZapSign document token and update status
    const { error: updateError } = await supabase
      .from("contratos")
      .update({
        zapsign_id: result.token,
        assinatura_status: "aguardando",
      })
      .eq("id", contrato_id);

    if (updateError) {
      console.error("Failed to update contrato after ZapSign call:", updateError);
      return NextResponse.json(
        { error: "Failed to update contrato status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      link: result.request_signature_link,
      token: result.token,
    });
  } catch (err) {
    console.error("POST /api/zapsign/criar-documento error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
