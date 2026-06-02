import { Users, ClipboardList, Receipt, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/ui/StatsCard';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { OSStatus, BoletoStatus } from '@/lib/types';

// ─── Types for joined query results ──────────────────────────────────────────

interface OSRow {
  id: string;
  numero: string;
  titulo: string;
  status: OSStatus;
  vencimento: string;
  clientes: { razao_social: string } | null;
}

interface BoletoRow {
  id: string;
  valor: number;
  vencimento: string;
  status: BoletoStatus;
  clientes: { razao_social: string } | null;
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

function osBadgeVariant(status: OSStatus) {
  switch (status) {
    case 'aberta':       return 'info'    as const;
    case 'em_andamento': return 'warning' as const;
    case 'concluida':    return 'success' as const;
    case 'cancelada':    return 'default' as const;
  }
}

function osStatusLabel(status: OSStatus) {
  switch (status) {
    case 'aberta':       return 'Aberta';
    case 'em_andamento': return 'Em Andamento';
    case 'concluida':    return 'Concluída';
    case 'cancelada':    return 'Cancelada';
  }
}

function boletoBadgeVariant(status: BoletoStatus) {
  switch (status) {
    case 'pendente':  return 'warning' as const;
    case 'emitido':   return 'info'    as const;
    case 'pago':      return 'success' as const;
    case 'vencido':   return 'danger'  as const;
    case 'cancelado': return 'default' as const;
  }
}

function boletoStatusLabel(status: BoletoStatus) {
  switch (status) {
    case 'pendente':  return 'Pendente';
    case 'emitido':   return 'Emitido';
    case 'pago':      return 'Pago';
    case 'vencido':   return 'Vencido';
    case 'cancelado': return 'Cancelado';
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  // Build "today" and "today + 7 days" as ISO date strings
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const plus7 = new Date(today);
  plus7.setDate(plus7.getDate() + 7);
  const plus7Str = plus7.toISOString().split('T')[0];

  // ── Parallel fetches ─────────────────────────────────────────────────────────
  const [
    clientesResult,
    osResult,
    boletosPendentesResult,
    boletosVencidosResult,
    ultimasOSResult,
    proximosVencimentosResult,
  ] = await Promise.all([
    // 1. Active clients count
    supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true),

    // 2. Open OS count
    supabase
      .from('ordens_servico')
      .select('id', { count: 'exact', head: true })
      .in('status', ['aberta', 'em_andamento']),

    // 3. Pending boletos sum
    supabase
      .from('boletos')
      .select('valor')
      .eq('status', 'pendente'),

    // 4. Overdue boletos sum
    supabase
      .from('boletos')
      .select('valor')
      .eq('status', 'vencido'),

    // 5. Last 5 OS with client name
    supabase
      .from('ordens_servico')
      .select('id, numero, titulo, status, vencimento, clientes(razao_social)')
      .order('created_at', { ascending: false })
      .limit(5),

    // 6. Next 7 days boletos with client name
    supabase
      .from('boletos')
      .select('id, valor, vencimento, status, clientes(razao_social)')
      .eq('status', 'pendente')
      .gte('vencimento', todayStr)
      .lte('vencimento', plus7Str)
      .order('vencimento', { ascending: true }),
  ]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const clientesAtivos = clientesResult.count ?? 0;
  const osAbertas = osResult.count ?? 0;

  const totalPendentes = (boletosPendentesResult.data ?? []).reduce(
    (acc, b) => acc + (b.valor ?? 0),
    0
  );
  const totalVencidos = (boletosVencidosResult.data ?? []).reduce(
    (acc, b) => acc + (b.valor ?? 0),
    0
  );

  const ultimasOS = (ultimasOSResult.data ?? []) as unknown as OSRow[];
  const proximosVencimentos = (proximosVencimentosResult.data ?? []) as unknown as BoletoRow[];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-[#1E0A3C]">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Visão geral do sistema — {formatDate(todayStr)}
          </p>
        </div>

        {/* Stats cards */}
        <section aria-label="Resumo">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              variant="purple"
              icon={<Users className="h-6 w-6" />}
              title="Clientes Ativos"
              value={clientesAtivos}
            />
            <StatsCard
              variant="yellow"
              icon={<ClipboardList className="h-6 w-6" />}
              title="OS Abertas"
              value={osAbertas}
            />
            <StatsCard
              variant="green"
              icon={<Receipt className="h-6 w-6" />}
              title="Boletos Pendentes"
              value={formatCurrency(totalPendentes)}
            />
            <StatsCard
              variant="red"
              icon={<AlertCircle className="h-6 w-6" />}
              title="Boletos Vencidos"
              value={formatCurrency(totalVencidos)}
            />
          </div>
        </section>

        {/* Últimas Ordens de Serviço */}
        <section aria-label="Últimas Ordens de Serviço">
          <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-[#1E0A3C]">
                Últimas Ordens de Serviço
              </h2>
            </div>

            {ultimasOS.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">
                Nenhuma ordem de serviço encontrada.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-left">
                      <th className="px-6 py-3 font-medium text-gray-500">Número</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Título</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ultimasOS.map((os) => (
                      <tr
                        key={os.id}
                        className="transition-colors hover:bg-gray-50/70"
                      >
                        <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-gray-700">
                          {os.numero}
                        </td>
                        <td className="px-6 py-3 text-gray-800">
                          {os.clientes?.razao_social ?? '—'}
                        </td>
                        <td className="px-6 py-3 text-gray-700">{os.titulo}</td>
                        <td className="px-6 py-3">
                          <Badge variant={osBadgeVariant(os.status)} dot>
                            {osStatusLabel(os.status)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                          {formatDate(os.vencimento)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Próximos Vencimentos */}
        <section aria-label="Próximos Vencimentos">
          <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-[#1E0A3C]">
                Próximos Vencimentos{' '}
                <span className="ml-1 text-sm font-normal text-gray-400">(7 dias)</span>
              </h2>
            </div>

            {proximosVencimentos.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">
                Nenhum boleto vencendo nos próximos 7 dias.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-left">
                      <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Valor</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Vencimento</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {proximosVencimentos.map((boleto) => (
                      <tr
                        key={boleto.id}
                        className="transition-colors hover:bg-gray-50/70"
                      >
                        <td className="px-6 py-3 text-gray-800">
                          {boleto.clientes?.razao_social ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 font-semibold text-gray-800">
                          {formatCurrency(boleto.valor ?? 0)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                          {formatDate(boleto.vencimento)}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={boletoBadgeVariant(boleto.status)} dot>
                            {boletoStatusLabel(boleto.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
