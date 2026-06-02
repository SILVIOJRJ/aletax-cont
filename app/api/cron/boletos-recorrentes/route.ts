import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { createBoleto } from "@/lib/cora";
import type { OrdemServico, Cliente } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret when configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const supabase = await createAdminClient();

    // Fetch all recurring OS that are active and should generate boletos
    const { data: ordens, error: osError } = await supabase
      .from("ordens_servico")
      .select("*, cliente:clientes(*)")
      .eq("boleto_recorrente", true)
      .eq("gerar_boleto", true)
      .in("status", ["em_andamento", "concluida"])
      .returns<(OrdemServico & { cliente: Cliente })[]>();

    if (osError) {
      console.error("boletos-recorrentes: failed to fetch ordens:", osError);
      return NextResponse.json(
        { error: "Failed to fetch ordens de servico" },
        { status: 500 }
      );
    }

    let processed = 0;
    let created = 0;

    for (const os of ordens ?? []) {
      processed++;

      try {
        // Check whether a boleto already exists for this OS in the current month
        const { count, error: countError } = await supabase
          .from("boletos")
          .select("id", { count: "exact", head: true })
          .eq("ordem_servico_id", os.id)
          .gte(
            "vencimento",
            new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              .toISOString()
              .slice(0, 10)
          )
          .lt(
            "vencimento",
            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
              .toISOString()
              .slice(0, 10)
          );

        if (countError) {
          console.error(
            `boletos-recorrentes: count check failed for OS ${os.id}:`,
            countError
          );
          continue;
        }

        if ((count ?? 0) > 0) {
          // Boleto already exists this month — skip
          continue;
        }

        const cliente = os.cliente!;
        const digitsOnly = cliente.cnpj_cpf.replace(/\D/g, "");
        const docType: "CPF" | "CPJ" = digitsOnly.length > 11 ? "CPJ" : "CPF";

        // Use the OS vencimento date but adjust to current month
        const now = new Date();
        const originalDue = new Date(os.vencimento);
        const dueDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          originalDue.getDate()
        );
        const dueDateStr = dueDate.toISOString().slice(0, 10);

        const coraResult = await createBoleto({
          code: os.numero,
          amount: Math.round(os.valor * 100),
          due_date: dueDateStr,
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

        const { error: insertError } = await supabase.from("boletos").insert({
          ordem_servico_id: os.id,
          cliente_id: os.cliente_id,
          cora_id: coraResult.id,
          valor: os.valor,
          vencimento: dueDateStr,
          status: "pendente",
          linha_digitavel: coraResult.digitable_line ?? null,
          url_boleto: coraResult.payment_link ?? null,
        });

        if (insertError) {
          console.error(
            `boletos-recorrentes: failed to insert boleto for OS ${os.id}:`,
            insertError
          );
          continue;
        }

        created++;
      } catch (err) {
        console.error(
          `boletos-recorrentes: error processing OS ${os.id}:`,
          err
        );
        // Continue processing remaining items
      }
    }

    return NextResponse.json({ processed, created });
  } catch (err) {
    console.error("GET /api/cron/boletos-recorrentes error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
