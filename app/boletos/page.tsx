'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, XCircle, CheckCircle } from 'lucide-react';

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { getSupabaseBrowser } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Boleto, BoletoStatus } from '@/lib/types';

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'emitido', label: 'Emitido' },
  { value: 'pago', label: 'Pago' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'cancelado', label: 'Cancelado' },
];

function boletoBadge(status: BoletoStatus) {
  const map: Record<BoletoStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
    pendente:  { variant: 'warning', label: 'Pendente' },
    emitido:   { variant: 'info',    label: 'Emitido' },
    pago:      { variant: 'success', label: 'Pago' },
    vencido:   { variant: 'danger',  label: 'Vencido' },
    cancelado: { variant: 'default', label: 'Cancelado' },
  };
  const { variant, label } = map[status] ?? { variant: 'default', label: status };
  return <Badge variant={variant} dot>{label}</Badge>;
}

interface Stats {
  pendentesCount: number;
  pendentesTotal: number;
  pagosCount: number;
  pagosTotal: number;
  vencidosCount: number;
  vencidosTotal: number;
}

export default function BoletosPage() {
  const supabase = getSupabaseBrowser();

  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const stats: Stats = boletos.reduce<Stats>(
    (acc, b) => {
      if (b.status === 'pendente' || b.status === 'emitido') {
        acc.pendentesCount++;
        acc.pendentesTotal += b.valor;
      } else if (b.status === 'pago') {
        acc.pagosCount++;
        acc.pagosTotal += b.valor;
      } else if (b.status === 'vencido') {
        acc.vencidosCount++;
        acc.vencidosTotal += b.valor;
      }
      return acc;
    },
    { pendentesCount: 0, pendentesTotal: 0, pagosCount: 0, pagosTotal: 0, vencidosCount: 0, vencidosTotal: 0 }
  );

  const fetchBoletos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('boletos')
      .select('*, cliente:clientes(id, razao_social), ordem_servico:ordens_servico(id, numero, titulo)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar boletos');
    } else {
      setBoletos((data as Boleto[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchBoletos(); }, [fetchBoletos]);

  const filtered = boletos.filter((b) => {
    const clienteName = b.cliente?.razao_social ?? '';
    const matchSearch =
      search === '' || clienteName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === '' || b.status === filterStatus;
    const matchFrom = dateFrom === '' || b.vencimento >= dateFrom;
    const matchTo = dateTo === '' || b.vencimento <= dateTo;
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  const copyLinha = (linha: string) => {
    navigator.clipboard.writeText(linha).then(() => toast.success('Copiado!'));
  };

  const handleCancelar = async (b: Boleto) => {
    setActionLoadingId(b.id);
    try {
      const res = await fetch('/api/cora/cancelar-boleto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boletoId: b.id, coraId: b.cora_id }),
      });
      if (!res.ok) throw new Error('Falha ao cancelar no Cora');
      toast.success('Boleto cancelado!');
      await fetchBoletos();
    } catch {
      toast.error('Erro ao cancelar boleto');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarcarPago = async (b: Boleto) => {
    setActionLoadingId(b.id);
    const { error } = await supabase
      .from('boletos')
      .update({ status: 'pago' })
      .eq('id', b.id);

    if (error) {
      toast.error('Erro ao marcar como pago');
    } else {
      toast.success('Boleto marcado como pago!');
      await fetchBoletos();
    }
    setActionLoadingId(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1E0A3C]">Boletos</h1>
          <p className="mt-1 text-sm text-gray-500">{filtered.length} boleto(s) encontrado(s)</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-yellow-50 p-4 ring-1 ring-yellow-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">Pendentes / Emitidos</p>
            <p className="mt-1 text-2xl font-bold text-yellow-800">{formatCurrency(stats.pendentesTotal)}</p>
            <p className="mt-0.5 text-xs text-yellow-600">{stats.pendentesCount} boleto(s)</p>
          </div>
          <div className="rounded-xl bg-green-50 p-4 ring-1 ring-green-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Pagos</p>
            <p className="mt-1 text-2xl font-bold text-green-800">{formatCurrency(stats.pagosTotal)}</p>
            <p className="mt-0.5 text-xs text-green-600">{stats.pagosCount} boleto(s)</p>
          </div>
          <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Vencidos</p>
            <p className="mt-1 text-2xl font-bold text-red-800">{formatCurrency(stats.vencidosTotal)}</p>
            <p className="mt-0.5 text-xs text-red-600">{stats.vencidosCount} boleto(s)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput
            value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}            placeholder="Buscar por cliente..."
            className="flex-1"
          />
          <Select
            options={statusOptions}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            containerClassName="sm:w-44"
          />
          <div className="flex items-end gap-2">
            <Input
              label="De"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm"
            />
            <Input
              label="Até"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <Table loading={loading} emptyMessage="Nenhum boleto encontrado.">
          <Thead>
            <tr>
              <Th>Cliente</Th>
              <Th>OS Vinculada</Th>
              <Th>Valor</Th>
              <Th>Vencimento</Th>
              <Th>Status</Th>
              <Th>Linha Digitável</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <Tbody>
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  Nenhum boleto encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((b, idx) => (
                <Tr key={b.id} zebra index={idx}>
                  <Td>{b.cliente?.razao_social ?? '—'}</Td>
                  <Td>
                    {b.ordem_servico ? (
                      <span className="font-mono text-xs text-[#8B3FD4]">{b.ordem_servico.numero}</span>
                    ) : '—'}
                  </Td>
                  <Td className="font-semibold">{formatCurrency(b.valor)}</Td>
                  <Td>{formatDate(b.vencimento)}</Td>
                  <Td>{boletoBadge(b.status)}</Td>
                  <Td>
                    <span className="max-w-[180px] truncate block font-mono text-xs text-gray-500">
                      {b.linha_digitavel ?? '—'}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {b.linha_digitavel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLinha(b.linha_digitavel!)}
                          title="Copiar linha digitável"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => b.url_boleto && window.open(b.url_boleto, '_blank')}
                        disabled={!b.url_boleto}
                        title="Abrir boleto"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      {(b.status === 'pendente' || b.status === 'emitido') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleMarcarPago(b)}
                            loading={actionLoadingId === b.id}
                            title="Marcar como pago"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => handleCancelar(b)}
                            loading={actionLoadingId === b.id}
                            title="Cancelar boleto"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {(b.status === 'vencido') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleMarcarPago(b)}
                          loading={actionLoadingId === b.id}
                          title="Marcar como pago"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </div>
    </AppLayout>
  );
}
