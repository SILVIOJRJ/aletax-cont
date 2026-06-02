'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { getSupabaseBrowser } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Boleto, OSStatus } from '@/lib/types';

interface ReceitaRow {
  id: string;
  cliente: string;
  os_numero: string;
  valor: number;
  vencimento: string;
}

interface ClienteVencidoRow {
  cliente_id: string;
  cliente: string;
  count: number;
  total: number;
}

interface OSStatusRow {
  status: OSStatus;
  count: number;
}

const statusLabels: Record<OSStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const lines = [headers, ...rows].map((r) =>
    r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosPage() {
  const supabase = getSupabaseBrowser();

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(lastOfMonth);
  const [loading, setLoading] = useState(false);

  const [receita, setReceita] = useState<ReceitaRow[]>([]);
  const [clientesVencidos, setClientesVencidos] = useState<ClienteVencidoRow[]>([]);
  const [osPorStatus, setOsPorStatus] = useState<OSStatusRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);

    try {
      // 1. Receita por período: boletos pagos no range
      const { data: boletosData, error: boletosError } = await supabase
        .from('boletos')
        .select('id, valor, vencimento, cliente:clientes(id, razao_social), ordem_servico:ordens_servico(id, numero)')
        .eq('status', 'pago')
        .gte('vencimento', dateFrom)
        .lte('vencimento', dateTo)
        .order('vencimento', { ascending: true });

      if (boletosError) throw boletosError;

      const receitaRows: ReceitaRow[] = ((boletosData as unknown as (Boleto & { cliente: { razao_social: string }; ordem_servico: { numero: string } | null })[]) ?? []).map((b) => ({
        id: b.id,
        cliente: b.cliente?.razao_social ?? '—',
        os_numero: b.ordem_servico?.numero ?? '—',
        valor: b.valor,
        vencimento: b.vencimento,
      }));
      setReceita(receitaRows);

      // 2. Clientes com boletos vencidos
      const { data: vencidosData, error: vencidosError } = await supabase
        .from('boletos')
        .select('cliente_id, valor, cliente:clientes(id, razao_social)')
        .eq('status', 'vencido');

      if (vencidosError) throw vencidosError;

      const vencidosMap = new Map<string, ClienteVencidoRow>();
      ((vencidosData as unknown as (Boleto & { cliente: { razao_social: string } })[]) ?? []).forEach((b) => {
        const existing = vencidosMap.get(b.cliente_id);
        if (existing) {
          existing.count++;
          existing.total += b.valor;
        } else {
          vencidosMap.set(b.cliente_id, {
            cliente_id: b.cliente_id,
            cliente: b.cliente?.razao_social ?? '—',
            count: 1,
            total: b.valor,
          });
        }
      });
      setClientesVencidos(Array.from(vencidosMap.values()).sort((a, b) => b.total - a.total));

      // 3. OS por status
      const { data: osData, error: osError } = await supabase
        .from('ordens_servico')
        .select('status');

      if (osError) throw osError;

      const statusMap = new Map<OSStatus, number>();
      ((osData ?? []) as { status: OSStatus }[]).forEach(({ status }) => {
        statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
      });
      setOsPorStatus(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  }, [supabase, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const receitaTotal = receita.reduce((acc, r) => acc + r.valor, 0);

  const exportReceita = () => {
    downloadCSV(
      `receita_${dateFrom}_${dateTo}.csv`,
      receita.map((r) => [r.cliente, r.os_numero, formatCurrency(r.valor), formatDate(r.vencimento)]),
      ['Cliente', 'OS', 'Valor', 'Vencimento']
    );
  };

  const exportVencidos = () => {
    downloadCSV(
      `clientes_vencidos.csv`,
      clientesVencidos.map((r) => [r.cliente, String(r.count), formatCurrency(r.total)]),
      ['Cliente', 'Qtd Vencidos', 'Total']
    );
  };

  const exportOsStatus = () => {
    downloadCSV(
      `os_por_status.csv`,
      osPorStatus.map((r) => [statusLabels[r.status] ?? r.status, String(r.count)]),
      ['Status', 'Quantidade']
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1E0A3C]">Relatórios</h1>
          <p className="mt-1 text-sm text-gray-500">Análise financeira e operacional</p>
        </div>

        {/* Date Range Filter */}
        <Card title="Período de análise">
          <div className="flex flex-wrap items-end gap-4">
            <Input
              label="De"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Até"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Button onClick={fetchData} loading={loading}>
              Filtrar
            </Button>
          </div>
        </Card>

        {/* Section 1: Receita por Período */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1E0A3C]">Receita por Período</h2>
              <p className="text-sm text-gray-500">Boletos pagos no período selecionado</p>
            </div>
            <Button variant="secondary" size="sm" onClick={exportReceita} disabled={receita.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          {/* Total card */}
          <div className="rounded-xl bg-[#F3EAFE] p-4 ring-1 ring-[#ddd0f5]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8B3FD4]">Total Recebido</p>
            <p className="mt-1 text-3xl font-bold text-[#1E0A3C]">{formatCurrency(receitaTotal)}</p>
            <p className="mt-0.5 text-xs text-[#8B3FD4]">{receita.length} boleto(s) pago(s)</p>
          </div>

          <Table loading={loading} emptyMessage="Nenhum boleto pago no período.">
            <Thead>
              <tr>
                <Th>Cliente</Th>
                <Th>OS</Th>
                <Th>Valor</Th>
                <Th>Vencimento</Th>
              </tr>
            </Thead>
            <Tbody>
              {!loading && receita.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhum boleto pago no período.
                  </td>
                </tr>
              ) : (
                receita.map((r, idx) => (
                  <Tr key={r.id} zebra index={idx}>
                    <Td>{r.cliente}</Td>
                    <Td><span className="font-mono text-xs text-[#8B3FD4]">{r.os_numero}</span></Td>
                    <Td className="font-semibold">{formatCurrency(r.valor)}</Td>
                    <Td>{formatDate(r.vencimento)}</Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>

        {/* Section 2: Clientes com Boletos Vencidos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1E0A3C]">Clientes com Boletos Vencidos</h2>
              <p className="text-sm text-gray-500">Posição atual de inadimplência</p>
            </div>
            <Button variant="secondary" size="sm" onClick={exportVencidos} disabled={clientesVencidos.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          <Table loading={loading} emptyMessage="Nenhum boleto vencido.">
            <Thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Qtd. Vencidos</Th>
                <Th>Total em Aberto</Th>
              </tr>
            </Thead>
            <Tbody>
              {!loading && clientesVencidos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhum boleto vencido.
                  </td>
                </tr>
              ) : (
                clientesVencidos.map((r, idx) => (
                  <Tr key={r.cliente_id} zebra index={idx}>
                    <Td>{r.cliente}</Td>
                    <Td>
                      <Badge variant="danger">{r.count}</Badge>
                    </Td>
                    <Td className="font-semibold text-red-600">{formatCurrency(r.total)}</Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>

        {/* Section 3: OS por Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1E0A3C]">OS por Status</h2>
              <p className="text-sm text-gray-500">Visão geral das ordens de serviço</p>
            </div>
            <Button variant="secondary" size="sm" onClick={exportOsStatus} disabled={osPorStatus.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          <Table loading={loading} emptyMessage="Nenhuma OS encontrada.">
            <Thead>
              <tr>
                <Th>Status</Th>
                <Th>Quantidade</Th>
              </tr>
            </Thead>
            <Tbody>
              {!loading && osPorStatus.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhuma OS encontrada.
                  </td>
                </tr>
              ) : (
                osPorStatus.map((r, idx) => {
                  const variantMap: Record<OSStatus, 'info' | 'warning' | 'success' | 'danger'> = {
                    aberta: 'info',
                    em_andamento: 'warning',
                    concluida: 'success',
                    cancelada: 'danger',
                  };
                  return (
                    <Tr key={r.status} zebra index={idx}>
                      <Td>
                        <Badge variant={variantMap[r.status]} dot>
                          {statusLabels[r.status] ?? r.status}
                        </Badge>
                      </Td>
                      <Td className="font-semibold">{r.count}</Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
