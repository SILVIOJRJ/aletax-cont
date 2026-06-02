'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Eye } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/SearchInput';
import { getSupabaseBrowser } from '@/lib/supabase';
import type { Contrato } from '@/lib/types';

type StatusFilter = 'todos' | 'ativo' | 'inativo' | 'encerrado';

const assinaturaLabels: Record<string, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
};

const assinaturaBadge: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  pendente: 'warning',
  enviado: 'info',
  assinado: 'success',
  cancelado: 'danger',
};

export default function ContratosPage() {
  const router = useRouter();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchContratos = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowser();

    let query = supabase
      .from('contratos')
      .select('*, cliente:clientes(id, razao_social, cnpj_cpf)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'todos') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      showToast('Erro ao carregar contratos.', 'error');
      setLoading(false);
      return;
    }

    let result = (data as Contrato[]) ?? [];

    // Client-side search by cliente name
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.cliente?.razao_social?.toLowerCase().includes(term) ||
          c.numero?.toLowerCase().includes(term)
      );
    }

    setContratos(result);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchContratos();
  }, [fetchContratos]);

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'ativo', label: 'Ativos' },
    { key: 'inativo', label: 'Inativos' },
    { key: 'encerrado', label: 'Encerrados' },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      ativo: 'success',
      inativo: 'warning',
      encerrado: 'danger',
    };
    return (
      <Badge variant={map[status] ?? 'default'} dot>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const fmtCurrency = (v: number) =>
    v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—';

  const fmtDate = (d: string | null) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

  return (
    <AppLayout>
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1E0A3C]">Contratos</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Gerencie os contratos de prestação de serviços
            </p>
          </div>
          <Button onClick={() => router.push('/contratos/novo')}>
            <Plus className="h-4 w-4" />
            Novo Contrato
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Buscar por cliente ou número..."
            value={search}
            onChange={setSearch}
            containerClassName="w-full sm:max-w-sm"
          />
          <div className="flex rounded-lg border border-gray-200 bg-white p-1 gap-1">
            {statusTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === t.key
                    ? 'bg-[#8B3FD4] text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Table loading={loading} emptyMessage="Nenhum contrato encontrado.">
          <Thead>
            <tr>
              <Th>Número</Th>
              <Th>Cliente</Th>
              <Th>Valor Mensal</Th>
              <Th>Início</Th>
              <Th>Status</Th>
              <Th>Assinatura</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <Tbody>
            {!loading && contratos.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  Nenhum contrato encontrado.
                </td>
              </tr>
            ) : (
              contratos.map((c, i) => (
                <Tr key={c.id} zebra index={i}>
                  <Td>
                    <span className="font-mono text-xs font-medium text-[#8B3FD4]">
                      {c.numero}
                    </span>
                  </Td>
                  <Td>
                    <div>
                      <p className="font-medium text-[#1E0A3C]">
                        {c.cliente?.razao_social ?? '—'}
                      </p>
                      {c.cliente?.cnpj_cpf && (
                        <p className="text-xs text-gray-400">{c.cliente.cnpj_cpf}</p>
                      )}
                    </div>
                  </Td>
                  <Td>{fmtCurrency(c.valor_mensal)}</Td>
                  <Td>{fmtDate(c.data_inicio)}</Td>
                  <Td>{statusBadge(c.status)}</Td>
                  <Td>
                    <Badge variant={assinaturaBadge[c.assinatura_status] ?? 'default'}>
                      {assinaturaLabels[c.assinatura_status] ?? c.assinatura_status}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/contratos/${c.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                      </Link>
                      <Link href={`/contratos/${c.id}`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      </Link>
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
