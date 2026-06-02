'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Pencil, CheckCircle, XCircle } from 'lucide-react';

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { getSupabaseBrowser } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { OrdemServico, OSStatus } from '@/lib/types';

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

const tipoOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'avulso', label: 'Avulso' },
  { value: 'mensalidade', label: 'Mensalidade' },
];

function statusBadge(status: OSStatus) {
  const map: Record<OSStatus, { variant: 'success' | 'info' | 'default' | 'danger' | 'warning'; label: string }> = {
    aberta: { variant: 'info', label: 'Aberta' },
    em_andamento: { variant: 'warning', label: 'Em Andamento' },
    concluida: { variant: 'success', label: 'Concluída' },
    cancelada: { variant: 'danger', label: 'Cancelada' },
  };
  const { variant, label } = map[status] ?? { variant: 'default', label: status };
  return <Badge variant={variant} dot>{label}</Badge>;
}

function tipoBadge(tipo: string) {
  return (
    <Badge variant={tipo === 'mensalidade' ? 'purple' : 'default'}>
      {tipo === 'mensalidade' ? 'Mensalidade' : 'Avulso'}
    </Badge>
  );
}

type ConfirmAction = { id: string; action: 'concluir' | 'cancelar'; numero: string } | null;

export default function OrdensServicoPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrdens = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*, cliente:clientes(id, razao_social, nome_fantasia)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar ordens de serviço');
    } else {
      setOrdens((data as OrdemServico[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchOrdens(); }, [fetchOrdens]);

  const filtered = ordens.filter((os) => {
    const clienteName = os.cliente?.razao_social ?? '';
    const matchSearch =
      search === '' ||
      clienteName.toLowerCase().includes(search.toLowerCase()) ||
      os.titulo.toLowerCase().includes(search.toLowerCase()) ||
      os.numero.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === '' || os.status === filterStatus;
    const matchTipo = filterTipo === '' || os.tipo === filterTipo;
    return matchSearch && matchStatus && matchTipo;
  });

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    const newStatus: OSStatus = confirmAction.action === 'concluir' ? 'concluida' : 'cancelada';
    const { error } = await supabase
      .from('ordens_servico')
      .update({ status: newStatus })
      .eq('id', confirmAction.id);

    if (error) {
      toast.error('Erro ao atualizar status da OS');
    } else {
      toast.success(`OS ${confirmAction.numero} ${confirmAction.action === 'concluir' ? 'concluída' : 'cancelada'} com sucesso`);
      await fetchOrdens();
    }
    setActionLoading(false);
    setConfirmAction(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1E0A3C]">Ordens de Serviço</h1>
            <p className="mt-1 text-sm text-gray-500">{filtered.length} ordem(ns) encontrada(s)</p>
          </div>
          <Button onClick={() => router.push('/ordens-servico/nova')}>
            <Plus className="h-4 w-4" />
            Nova OS
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, título ou número..."
            className="flex-1"
          />
          <Select
            options={statusOptions}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            containerClassName="sm:w-48"
          />
          <Select
            options={tipoOptions}
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            containerClassName="sm:w-40"
          />
        </div>

        {/* Table */}
        <Table loading={loading} emptyMessage="Nenhuma ordem de serviço encontrada.">
          <Thead>
            <tr>
              <Th>Número</Th>
              <Th>Cliente</Th>
              <Th>Título</Th>
              <Th>Tipo</Th>
              <Th>Valor</Th>
              <Th>Vencimento</Th>
              <Th>Status</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <Tbody>
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                  Nenhuma ordem de serviço encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((os, idx) => (
                <Tr key={os.id} zebra index={idx}>
                  <Td>
                    <span className="font-mono text-xs font-semibold text-[#8B3FD4]">{os.numero}</span>
                  </Td>
                  <Td>{os.cliente?.razao_social ?? '—'}</Td>
                  <Td className="max-w-[200px] truncate">{os.titulo}</Td>
                  <Td>{tipoBadge(os.tipo)}</Td>
                  <Td>{formatCurrency(os.valor)}</Td>
                  <Td>{formatDate(os.vencimento)}</Td>
                  <Td>{statusBadge(os.status)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/ordens-servico/${os.id}`)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {(os.status === 'aberta' || os.status === 'em_andamento') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => setConfirmAction({ id: os.id, action: 'concluir', numero: os.numero })}
                            title="Concluir"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => setConfirmAction({ id: os.id, action: 'cancelar', numero: os.numero })}
                            title="Cancelar"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </div>

      {/* Confirm Modal */}
      <Modal
        open={!!confirmAction}
        onClose={() => !actionLoading && setConfirmAction(null)}
        title={confirmAction?.action === 'concluir' ? 'Concluir OS' : 'Cancelar OS'}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Tem certeza que deseja{' '}
          <strong>{confirmAction?.action === 'concluir' ? 'concluir' : 'cancelar'}</strong> a OS{' '}
          <strong>{confirmAction?.numero}</strong>?
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setConfirmAction(null)} disabled={actionLoading}>
            Voltar
          </Button>
          <Button
            variant={confirmAction?.action === 'cancelar' ? 'danger' : 'primary'}
            size="sm"
            loading={actionLoading}
            onClick={handleConfirmAction}
          >
            {confirmAction?.action === 'concluir' ? 'Concluir' : 'Cancelar OS'}
          </Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
