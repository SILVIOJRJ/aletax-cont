'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/SearchInput';
import { getSupabaseBrowser } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';

type FilterTab = 'todos' | 'ativos' | 'inativos';

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('todos');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowser();
    let query = supabase
      .from('clientes')
      .select('*')
      .order('razao_social', { ascending: true });

    if (tab === 'ativos') query = query.eq('ativo', true);
    if (tab === 'inativos') query = query.eq('ativo', false);

    if (search.trim()) {
      query = query.or(
        `razao_social.ilike.%${search.trim()}%,cnpj_cpf.ilike.%${search.trim()}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      showToast('Erro ao carregar clientes.', 'error');
    } else {
      setClientes((data as Cliente[]) ?? []);
    }
    setLoading(false);
  }, [search, tab]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleToggleAtivo = async (cliente: Cliente) => {
    setTogglingId(cliente.id);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase
      .from('clientes')
      .update({ ativo: !cliente.ativo })
      .eq('id', cliente.id);

    if (error) {
      showToast('Erro ao atualizar status.', 'error');
    } else {
      showToast(
        `Cliente ${!cliente.ativo ? 'ativado' : 'desativado'} com sucesso.`
      );
      fetchClientes();
    }
    setTogglingId(null);
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'ativos', label: 'Ativos' },
    { key: 'inativos', label: 'Inativos' },
  ];

  const regimeBadge = (regime: Cliente['regime_tributario']) => {
    if (!regime) return <span className="text-gray-400">—</span>;
    const map: Record<string, 'purple' | 'info' | 'warning' | 'default'> = {
      'Simples Nacional': 'purple',
      'Lucro Presumido': 'info',
      'Lucro Real': 'warning',
      MEI: 'default',
    };
    return <Badge variant={map[regime] ?? 'default'}>{regime}</Badge>;
  };

  return (
    <AppLayout>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg transition-all ${
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
            <h1 className="text-2xl font-bold text-[#1E0A3C]">Clientes</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Gerencie a carteira de clientes
            </p>
          </div>
          <Button onClick={() => router.push('/clientes/novo')}>
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Buscar por razão social ou CNPJ/CPF..."
            value={search}
            onChange={setSearch}
            containerClassName="w-full sm:max-w-sm"
          />
          <div className="flex rounded-lg border border-gray-200 bg-white p-1 gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.key
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
        <Table loading={loading} emptyMessage="Nenhum cliente encontrado.">
          <Thead>
            <tr>
              <Th>Razão Social</Th>
              <Th>CNPJ/CPF</Th>
              <Th>Email</Th>
              <Th>Regime</Th>
              <Th>Status</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <Tbody>
            {!loading && clientes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              clientes.map((c, i) => (
                <Tr key={c.id} zebra index={i}>
                  <Td>
                    <div>
                      <p className="font-medium text-[#1E0A3C]">{c.razao_social}</p>
                      {c.nome_fantasia && (
                        <p className="text-xs text-gray-400">{c.nome_fantasia}</p>
                      )}
                    </div>
                  </Td>
                  <Td>{c.cnpj_cpf}</Td>
                  <Td>{c.email ?? <span className="text-gray-400">—</span>}</Td>
                  <Td>{regimeBadge(c.regime_tributario)}</Td>
                  <Td>
                    <Badge variant={c.ativo ? 'success' : 'danger'} dot>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/clientes/${c.id}`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={togglingId === c.id}
                        onClick={() => handleToggleAtivo(c)}
                        title={c.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {c.ativo ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                        {c.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
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
