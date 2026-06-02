import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    const { data: contrato, error } = await supabase
      .from("contratos")
      .select("*, cliente:clientes(*)")
      .eq("id", id)
      .single();

    if (error || !contrato) {
      return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    }

    // Build a minimal HTML document and return it as text/html.
    // Replace this with a real PDF generator (e.g. @react-pdf/renderer or puppeteer)
    // when one is available in the project.
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Contrato ${contrato.numero}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#1E0A3C;}h1{color:#8B3FD4;}table{width:100%;border-collapse:collapse;}td{padding:8px;border-bottom:1px solid #eee;}</style>
</head>
<body>
<h1>ALETAX CONT</h1>
<h2>Contrato nº ${contrato.numero}</h2>
<table>
  <tr><td><b>Cliente</b></td><td>${contrato.cliente?.razao_social ?? "-"}</td></tr>
  <tr><td><b>Valor</b></td><td>R$ ${Number(contrato.valor ?? 0).toFixed(2)}</td></tr>
  <tr><td><b>Início</b></td><td>${contrato.data_inicio ?? "-"}</td></tr>
  <tr><td><b>Término</b></td><td>${contrato.data_fim ?? "-"}</td></tr>
  <tr><td><b>Status</b></td><td>${contrato.status ?? "-"}</td></tr>
</table>
${contrato.contrato_html ? `<hr/><div>${contrato.contrato_html}</div>` : ""}
</body></html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("GET /api/contratos/[id]/pdf error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
