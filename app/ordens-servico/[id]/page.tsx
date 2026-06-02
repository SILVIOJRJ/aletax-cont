'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, ExternalLink } from 'lucide-react';

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { getSupabaseBrowser } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { OrdemServico, Boleto, Cliente, Contrato, Profile, BoletoStatus } from '@/lib/types';

function boletoBadge(status: BoletoStatus) {
  const map: Record<BoletoStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
    pendente: { variant: 'warning', label: 'Pendente' },
    emitido:  { variant: 'info',    label: 'Emitido' },
    pago:     { variant: 'success', label: 'Pago' },
    vencido:  { variant: 'danger',  label: 'Vencido' },
    cancelado:{ variant: 'default', label: 'Cancelado' },
  };
  const { variant, label } = map[status] ?? { variant: 'default', label: status };
  return <Badge variant={variant} dot>{label}</Badge>;
}

export default function EditarOSPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const supabase = getSupabaseBrowser();

  const [os, setOs] = useState<OrdemServico | null>(null);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [responsaveis, setResponsaveis] = useState<Profile[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');

  const [form, setForm] = useState({
    cliente_id: '',
    contrato_id: '',
    titulo: '',
    descricao: '',
    tipo: 'avulso' as 'avulso' | 'mensalidade',
    valor: '',
    status: 'aberta' as 'aberta' | 'em_andamento' | 'concluida' | 'cancelada',
    vencimento: '',
    responsavel_id: '',
    gerar_boleto: false,
    boleto_recorrente: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadContratos = useCallback(async (clienteId: string) => {
    if (!clienteId) { setContratos([]); return; }
    const { data } = await supabase
      .from('contratos')
      .select('id, numero, descricao, status')
      .eq('cliente_id', clienteId)
      .eq('status', 'ativo');
    setContratos((data as Contrato[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    const load = async () => {
      setLoadingPage(true);
      const [
        { data: osData, error: osError },
        { data: boletosData },
        { data: cls },
        { data: profs },
      ] = await Promise.all([
        supabase.from('ordens_servico').select('*, cliente:clientes(*)').eq('id', id).single(),
        supabase.from('boletos').select('*, cliente:clientes(id, razao_social)').eq('ordem_servico_id', id).order('created_at', { ascending: false }),
        supabase.from('clientes').select('id, razao_social, nome_fantasia').eq('ativo', true).order('razao_social'),
        supabase.from('profiles').select('*').eq('ativo', true).order('nome'),
      ]);

      if (osError || !osData) {
        toast.error('Ordem de serviço não encontrada');
        router.push('/ordens-servico');
        return;
      }

      const osTyped = osData as OrdemServico;
      setOs(osTyped);
      setBoletos((boletosData as Boleto[]) ?? []);
      setClientes((cls as Cliente[]) ?? []);
      setResponsaveis((profs as Profile[]) ?? []);

      setForm({
        cliente_id: osTyped.cliente_id,
        contrato_id: osTyped.contrato_id ?? '',
        titulo: osTyped.titulo,
        descricao: osTyped.descricao ?? '',
        tipo: osTyped.tipo,
        valor: String(osTyped.valor),
        status: osTyped.status,
        vencimento: osTyped.vencimento,
        responsavel_id: osTyped.responsavel_id ?? '',
        gerar_boleto: osTyped.gerar_boleto,
        boleto_recorrente: osTyped.boleto_recorrente,
      });

      const cliente = (cls as Cliente[])?.find((c) => c.id === osTyped.cliente_id);
      setClienteSearch(cliente?.razao_social ?? '');

      await loadContratos(osTyped.cliente_id);
      setLoadingPage(false);
    };
    load();
  }, [id, supabase, router, loadContratos]);

  const filteredClientes = clientes.filter((c) =>
    clienteSearch === '' ||
    c.razao_social.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.nome_fantasia ?? '').toLowerCase().includes(clienteSearch.toLowerCase())
  );

  const handleClienteChange = (cid: string) => {
    setForm((f) => ({ ...f, cliente_id: cid, contrato_id: '' }));
    loadContratos(cid);
    const cliente = clientes.find((c) => c.id === cid);
    setClienteSearch(cliente?.razao_social ?? '');
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.cliente_id) errs.cliente_id = 'Selecione um cliente';
    if (!form.titulo.trim()) errs.titulo = 'Título é obrigatório';
    if (!form.valor || isNaN(Number(form.valor)) || Number(form.valor) <= 0) errs.valor = 'Informe um valor válido';
    if (!form.vencimento) errs.vencimento = 'Informe o vencimento';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoadingSave(true);

    const { error } = await supabase
      .from('ordens_servico')
      .update({
        cliente_id: form.cliente_id,
        contrato_id: form.contrato_id || null,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        tipo: form.tipo,
        valor: Number(form.valor),
        status: form.status,
        vencimento: form.vencimento,
        responsavel_id: form.responsavel_id || null,
        gerar_boleto: form.gerar_boleto,
        boleto_recorrente: form.boleto_recorrente,
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao salvar OS: ' + error.message);
    } else {
      toast.success('OS atualizada com sucesso!');
    }
    setLoadingSave(false);
  };

  const contratoOptions = [
    { value: '', label: 'Nenhum' },
    ...contratos.map((c) => ({ value: c.id, label: `${c.numero}${c.descricao ? ' – ' + c.descricao : ''}` })),
  ];

  const responsavelOptions = [
    { value: '', label: 'Sem responsável' },
    ...responsaveis.map((p) => ({ value: p.id, label: p.nome })),
  ];

  const statusOptions = [
    { value: 'aberta', label: 'Aberta' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'concluida', label: 'Concluída' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  if (loadingPage) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8B3FD4] border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6 print:max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#1E0A3C]">
                {os?.numero} — Editar OS
              </h1>
              <p className="text-sm text-gray-500">Atualize os dados da ordem de serviço</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => window.print()} title="Imprimir">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push('/boletos?os=' + id)}>
              <ExternalLink className="h-4 w-4" />
              Ver Boletos
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block">
          <h1 className="text-xl font-bold text-[#1E0A3C]">ALETAX CONT — Ordem de Serviço</h1>
          <p className="text-sm text-gray-600">{os?.numero} — Gerado em {formatDate(new Date().toISOString())}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <Card title="Dados da OS">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Cliente searchable */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#1E0A3C]">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Pesquisar cliente..."
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setForm((f) => ({ ...f, cliente_id: '' }));
                  }}
                  className="mb-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E0A3C] outline-none focus:border-[#8B3FD4] focus:ring-2 focus:ring-[#8B3FD4]/20"
                />
                {clienteSearch && !form.cliente_id && filteredClientes.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white shadow-md">
                    {filteredClientes.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-[#1E0A3C] hover:bg-[#F3EAFE]"
                        onClick={() => handleClienteChange(c.id)}
                      >
                        {c.razao_social}
                        {c.nome_fantasia && <span className="ml-2 text-xs text-gray-400">({c.nome_fantasia})</span>}
                      </button>
                    ))}
                  </div>
                )}
                {errors.cliente_id && <p className="mt-1 text-xs text-red-600">{errors.cliente_id}</p>}
              </div>

              <div className="sm:col-span-2">
                <Select
                  label="Contrato vinculado (opcional)"
                  options={contratoOptions}
                  value={form.contrato_id}
                  onChange={(e) => setForm((f) => ({ ...f, contrato_id: e.target.value }))}
                  disabled={!form.cliente_id || contratos.length === 0}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Título *"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  error={errors.titulo}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#1E0A3C]">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={3}
                  placeholder="Detalhes do serviço..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E0A3C] placeholder-gray-400 outline-none focus:border-[#8B3FD4] focus:ring-2 focus:ring-[#8B3FD4]/20"
                />
              </div>

              <Select
                label="Tipo"
                options={[
                  { value: 'avulso', label: 'Avulso' },
                  { value: 'mensalidade', label: 'Mensalidade' },
                ]}
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as 'avulso' | 'mensalidade' }))}
              />

              <Select
                label="Status"
                options={statusOptions}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))}
              />

              <Input
                label="Valor (R$) *"
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                error={errors.valor}
              />

              <Input
                label="Vencimento *"
                type="date"
                value={form.vencimento}
                onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
                error={errors.vencimento}
              />

              <div className="sm:col-span-2">
                <Select
                  label="Responsável"
                  options={responsavelOptions}
                  value={form.responsavel_id}
                  onChange={(e) => setForm((f) => ({ ...f, responsavel_id: e.target.value }))}
                />
              </div>
            </div>
          </Card>

          <Card title="Configurações de Boleto">
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.gerar_boleto}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gerar_boleto: e.target.checked,
                      boleto_recorrente: e.target.checked ? f.boleto_recorrente : false,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#8B3FD4] focus:ring-[#8B3FD4]"
                />
                <span className="text-sm font-medium text-[#1E0A3C]">Gerar boleto?</span>
              </label>
              {form.gerar_boleto && (
                <label className="ml-6 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.boleto_recorrente}
                    onChange={(e) => setForm((f) => ({ ...f, boleto_recorrente: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-[#8B3FD4] focus:ring-[#8B3FD4]"
                  />
                  <span className="text-sm text-gray-700">Boleto recorrente?</span>
                </label>
              )}
            </div>
          </Card>

          <div className="flex justify-end gap-3 print:hidden">
            <Button variant="secondary" type="button" onClick={() => router.back()} disabled={loadingSave}>
              Cancelar
            </Button>
            <Button type="submit" loading={loadingSave}>
              Salvar Alterações
            </Button>
          </div>
        </form>

        {/* Boletos vinculados */}
        <Card title="Boletos Vinculados" className="print:break-inside-avoid">
          <Table loading={false} emptyMessage="Nenhum boleto vinculado a esta OS.">
            <Thead>
              <tr>
                <Th>Nº Documento</Th>
                <Th>Valor</Th>
                <Th>Vencimento</Th>
                <Th>Status</Th>
                <Th>Linha Digitável</Th>
                <Th className="print:hidden text-right">Ações</Th>
              </tr>
            </Thead>
            <Tbody>
              {boletos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhum boleto vinculado a esta OS.
                  </td>
                </tr>
              ) : (
                boletos.map((b, idx) => (
                  <Tr key={b.id} zebra index={idx}>
                    <Td className="font-mono text-xs">{b.numero_documento ?? '—'}</Td>
                    <Td>{formatCurrency(b.valor)}</Td>
                    <Td>{formatDate(b.vencimento)}</Td>
                    <Td>{boletoBadge(b.status)}</Td>
                    <Td className="max-w-[200px] truncate font-mono text-xs text-gray-500">
                      {b.linha_digitavel ?? '—'}
                    </Td>
                    <Td className="print:hidden text-right">
                      {b.url_boleto && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(b.url_boleto!, '_blank')}
                          title="Abrir boleto"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
