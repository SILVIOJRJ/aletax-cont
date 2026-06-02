import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { createBoleto } from "@/lib/cora";
import type { OrdemServico, Cliente } from "@/lib/types";

interface RequestBodyWithOS {
  ordem_servico_id: string;
}

interface RequestBodyManual {
  cliente_id: string;
  valor: number;
  vencimento: string; // YYYY-MM-DD
  descricao: string;
}

type RequestBody = RequestBodyWithOS | RequestBodyManual;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const supabase = await createAdminClient();

    let ordemServicoId: string | null = null;
    let clienteId: string;
    let valor: number;
    let vencimento: string;
    let codigo: string;
    let cliente: Cliente;

    if ("ordem_servico_id" in body && body.ordem_servico_id) {
      // Fetch OS and its cliente
      const { data: os, error: osError } = await supabase
        .from("ordens_servico")
        .select("*, cliente:clientes(*)")
        .eq("id", body.ordem_servico_id)
        .single<OrdemServico & { cliente: Cliente }>();

      if (osError || !os) {
        return NextResponse.json(
          { error: "Ordem de serviço not found" },
          { status: 404 }
        );
      }

      ordemServicoId = os.id;
      clienteId = os.cliente_id;
      valor = os.valor;
      vencimento = os.vencimento;
      codigo = os.numero;
      cliente = os.cliente!;
    } else {
      const manual = body as RequestBodyManual;
      if (!manual.cliente_id || !manual.valor || !manual.vencimento) {
        return NextResponse.json(
          { error: "cliente_id, valor and vencimento are required" },
          { status: 400 }
        );
      }

      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", manual.cliente_id)
        .single<Cliente>();

      if (clienteError || !clienteData) {
        return NextResponse.json(
          { error: "Cliente not found" },
          { status: 404 }
        );
      }

      clienteId = manual.cliente_id;
      valor = manual.valor;
      vencimento = manual.vencimento;
      codigo = manual.descricao ?? `BOLETO-${Date.now()}`;
      cliente = clienteData;
    }

    // Determine document type by length of digits only
    const digitsOnly = cliente.cnpj_cpf.replace(/\D/g, "");
    const docType: "CPF" | "CPJ" = digitsOnly.length > 11 ? "CPJ" : "CPF";

    const coraResult = await createBoleto({
      code: codigo,
      amount: Math.round(valor * 100), // convert to centavos
      due_date: vencimento,
      payment_terms: { max_due_date_gap: 30 },
      customer: {
        name: cliente.razao_social,
        ...(cliente.email ? { email: cliente.email } : {}),
        document: {
          identity: digitsOnly,
          type: docType,
        },
      },
      notifications: { send_only_payment_receipts: false },
    });

    // Persist boleto in database
    const { data: boleto, error: insertError } = await supabase
      .from("boletos")
      .insert({
        ordem_servico_id: ordemServicoId,
        cliente_id: clienteId,
        cora_id: coraResult.id,
        valor,
        vencimento,
        status: "pendente",
        linha_digitavel: coraResult.digitable_line ?? null,
        url_boleto: coraResult.payment_link ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert boleto:", insertError);
      return NextResponse.json(
        { error: "Failed to persist boleto" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, boleto });
  } catch (err) {
    console.error("POST /api/cora/criar-boleto error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
