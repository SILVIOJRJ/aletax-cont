'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileText, Wrench, Receipt } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { getSupabaseBrowser } from '@/lib/supabase';
import type { Cliente, Contrato, OrdemServico, Boleto } from '@/lib/types';

type FormData = Omit<Cliente, 'id' | 'created_at'>;

type ActiveTab = 'contratos' | 'ordens' | 'boletos';

const regimeOptions = [
  { value: 'Simples Nacional', label: 'Simples Nacional' },
  { value: 'Lucro Presumido', label: 'Lucro Presumido' },
  { value: 'Lucro Real', label: 'Lucro Real' },
  { value: 'MEI', label: 'MEI' },
];

function toForm(c: Cliente): FormData {
  return {
    razao_social: c.razao_social,
    nome_fantasia: c.nome_fantasia,
    cnpj_cpf: c.cnpj_cpf,
    email: c.email,
    telefone: c.telefone,
    endereco_rua: c.endereco_rua,
    endereco_numero: c.endereco_numero,
    endereco_bairro: c.endereco_bairro,
    endereco_cidade: c.endereco_cidade,
    endereco_estado: c.endereco_estado,
    endereco_cep: c.endereco_cep,
    regime_tributario: c.regime_tributario,
    responsavel: c.responsavel,
    observacoes: c.observacoes,
    ativo: c.ativo,
  };
}

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('contratos');
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load cliente
  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        showToast('Cliente não encontrado.', 'error');
        router.push('/clientes');
        return;
      }
      setCliente(data as Cliente);
      setForm(toForm(data as Cliente));
      setLoading(false);
    }
    load();
  }, [id, router]);

  // Load tab data
  const loadTab = useCallback(
    async (tab: ActiveTab) => {
      setTabLoading(true);
      const supabase = getSupabaseBrowser();
      if (tab === 'contratos') {
        const { data } = await supabase
          .from('contratos')
          .select('*')
          .eq('cliente_id', id)
          .order('created_at', { ascending: false });
        setContratos((data as Contrato[]) ?? []);
      } else if (tab === 'ordens') {
        const { data } = await supabase
          .from('ordens_servico')
          .select('*')
          .eq('cliente_id', id)
          .order('created_at', { ascending: false });
        setOrdens((data as OrdemServico[]) ?? []);
      } else if (tab === 'boletos') {
        const { data } = await supabase
          .from('boletos')
          .select('*')
          .eq('cliente_id', id)
          .order('created_at', { ascending: false });
        setBoletos((data as Boleto[]) ?? []);
      }
      setTabLoading(false);
    },
    [id]
  );

  useEffect(() => {
    if (!loading) loadTab(activeTab);
  }, [activeTab, loading, loadTab]);

  const set = (field: keyof FormData, value: unknown) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    if (!form) return false;
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.razao_social.trim()) newErrors.razao_social = 'Campo obrigatório';
    if (!form.cnpj_cpf.trim()) newErrors.cnpj_cpf = 'Campo obrigatório';
    if (!form.email?.trim()) newErrors.email = 'Campo obrigatório';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !validate()) return;
    setSaving(true);
    const supabase = getSupabaseBrowser();
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
    );
    const { error } = await supabase
      .from('clientes')
      .update(payload)
      .eq('id', id);
    setSaving(false);
    if (error) {
      showToast('Erro ao salvar: ' + error.message, 'error');
    } else {
      showToast('Cliente atualizado com sucesso!');
    }
  };

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'contratos', label: 'Contratos', icon: <FileText className="h-4 w-4" /> },
    { key: 'ordens', label: 'Ordens de Serviço', icon: <Wrench className="h-4 w-4" /> },
    { key: 'boletos', label: 'Boletos', icon: <Receipt className="h-4 w-4" /> },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
      ativo: 'success',
      inativo: 'danger',
      encerrado: 'danger',
      suspenso: 'warning',
      aberta: 'info',
      em_andamento: 'warning',
      concluida: 'success',
      cancelada: 'danger',
      pendente: 'warning',
      emitido: 'info',
      pago: 'success',
      vencido: 'danger',
    } as Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info' | 'purple'>;
    return <Badge variant={map[status] ?? 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  const fmtCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

  if (loading || !form) {
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
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/clientes')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#1E0A3C]">{cliente?.razao_social}</h1>
            <p className="text-sm text-gray-500">Editar dados do cliente</p>
          </div>
          <Badge variant={cliente?.ativo ? 'success' : 'danger'} dot>
            {cliente?.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Principais */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-base font-semibold text-[#8B3FD4]">Dados Principais</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Razão Social *"
                value={form.razao_social}
                onChange={(e) => set('razao_social', e.target.value)}
                error={errors.razao_social}
                placeholder="Empresa Ltda."
              />
              <Input
                label="Nome Fantasia"
                value={form.nome_fantasia ?? ''}
                onChange={(e) => set('nome_fantasia', e.target.value)}
                placeholder="Nome comercial"
              />
              <Input
                label="CNPJ ou CPF *"
                value={form.cnpj_cpf}
                onChange={(e) => set('cnpj_cpf', e.target.value)}
                error={errors.cnpj_cpf}
                placeholder="00.000.000/0000-00"
              />
              <Input
                label="Email *"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                error={errors.email}
                placeholder="contato@empresa.com"
              />
              <Input
                label="Telefone"
                value={form.telefone ?? ''}
                onChange={(e) => set('telefone', e.target.value)}
                placeholder="(11) 99999-0000"
              />
              <Select
                label="Regime Tributário"
                value={form.regime_tributario ?? ''}
                onChange={(e) => set('regime_tributario', e.target.value || null)}
                options={regimeOptions}
                placeholder="Selecione..."
              />
            </div>
          </section>

          {/* Endereço */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-base font-semibold text-[#8B3FD4]">Endereço</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <Input
                  label="Rua / Logradouro"
                  value={form.endereco_rua ?? ''}
                  onChange={(e) => set('endereco_rua', e.target.value)}
                  placeholder="Av. Paulista"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Número"
                  value={form.endereco_numero ?? ''}
                  onChange={(e) => set('endereco_numero', e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Bairro"
                  value={form.endereco_bairro ?? ''}
                  onChange={(e) => set('endereco_bairro', e.target.value)}
                  placeholder="Bela Vista"
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Cidade"
                  value={form.endereco_cidade ?? ''}
                  onChange={(e) => set('endereco_cidade', e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Estado (UF)"
                  value={form.endereco_estado ?? ''}
                  onChange={(e) => set('endereco_estado', e.target.value)}
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
              <div className="sm:col-span-4">
                <Input
                  label="CEP"
                  value={form.endereco_cep ?? ''}
                  onChange={(e) => set('endereco_cep', e.target.value)}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </section>

          {/* Informações Adicionais */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-base font-semibold text-[#8B3FD4]">Informações Adicionais</h2>
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Responsável pelo Atendimento"
                value={form.responsavel ?? ''}
                onChange={(e) => set('responsavel', e.target.value)}
                placeholder="Nome do responsável interno"
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#1E0A3C]">Observações</label>
                <textarea
                  value={form.observacoes ?? ''}
                  onChange={(e) => set('observacoes', e.target.value)}
                  rows={4}
                  placeholder="Notas internas, particularidades do cliente..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E0A3C] placeholder-gray-400 outline-none transition-colors focus:border-[#8B3FD4] focus:ring-2 focus:ring-[#8B3FD4]/20 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-[#1E0A3C]">Status</label>
                <button
                  type="button"
                  onClick={() => set('ativo', !form.ativo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.ativo ? 'bg-[#8B3FD4]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      form.ativo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-500">{form.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.push('/clientes')}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </Button>
          </div>
        </form>

        {/* Related data tabs */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Tab header */}
          <div className="flex border-b border-gray-100">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === t.key
                    ? 'border-[#8B3FD4] text-[#8B3FD4]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* Contratos tab */}
            {activeTab === 'contratos' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{contratos.length} contrato(s)</p>
                  <Link href={`/contratos/novo?cliente_id=${id}`}>
                    <Button size="sm" variant="secondary">+ Novo Contrato</Button>
                  </Link>
                </div>
                <Table loading={tabLoading} emptyMessage="Nenhum contrato cadastrado.">
                  <Thead>
                    <tr>
                      <Th>Número</Th>
                      <Th>Descrição</Th>
                      <Th>Valor Mensal</Th>
                      <Th>Início</Th>
                      <Th>Status</Th>
                      <Th></Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {!tabLoading && contratos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                          Nenhum contrato cadastrado.
                        </td>
                      </tr>
                    ) : (
                      contratos.map((c, i) => (
                        <Tr key={c.id} zebra index={i}>
                          <Td className="font-mono text-xs">{c.numero}</Td>
                          <Td>{c.descricao ?? '—'}</Td>
                          <Td>{fmtCurrency(c.valor_mensal)}</Td>
                          <Td>{fmtDate(c.data_inicio)}</Td>
                          <Td>{statusBadge(c.status)}</Td>
                          <Td>
                            <Link href={`/contratos/${c.id}`}>
                              <Button size="sm" variant="ghost">Ver</Button>
                            </Link>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </div>
            )}

            {/* Ordens de Serviço tab */}
            {activeTab === 'ordens' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">{ordens.length} ordem(ns) de serviço</p>
                <Table loading={tabLoading} emptyMessage="Nenhuma ordem de serviço.">
                  <Thead>
                    <tr>
                      <Th>Número</Th>
                      <Th>Título</Th>
                      <Th>Tipo</Th>
                      <Th>Valor</Th>
                      <Th>Vencimento</Th>
                      <Th>Status</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {!tabLoading && ordens.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                          Nenhuma ordem de serviço.
                        </td>
                      </tr>
                    ) : (
                      ordens.map((o, i) => (
                        <Tr key={o.id} zebra index={i}>
                          <Td className="font-mono text-xs">{o.numero}</Td>
                          <Td>{o.titulo}</Td>
                          <Td>
                            <Badge variant={o.tipo === 'mensalidade' ? 'purple' : 'default'}>
                              {o.tipo}
                            </Badge>
                          </Td>
                          <Td>{fmtCurrency(o.valor)}</Td>
                          <Td>{fmtDate(o.vencimento)}</Td>
                          <Td>{statusBadge(o.status)}</Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </div>
            )}

            {/* Boletos tab */}
            {activeTab === 'boletos' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">{boletos.length} boleto(s)</p>
                <Table loading={tabLoading} emptyMessage="Nenhum boleto encontrado.">
                  <Thead>
                    <tr>
                      <Th>Documento</Th>
                      <Th>Valor</Th>
                      <Th>Vencimento</Th>
                      <Th>Status</Th>
                      <Th>Link</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {!tabLoading && boletos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                          Nenhum boleto encontrado.
                        </td>
                      </tr>
                    ) : (
                      boletos.map((b, i) => (
                        <Tr key={b.id} zebra index={i}>
                          <Td className="font-mono text-xs">{b.numero_documento ?? '—'}</Td>
                          <Td>{fmtCurrency(b.valor)}</Td>
                          <Td>{fmtDate(b.vencimento)}</Td>
                          <Td>{statusBadge(b.status)}</Td>
                          <Td>
                            {b.url_boleto ? (
                              <a
                                href={b.url_boleto}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#8B3FD4] underline text-xs hover:text-[#7a35bb]"
                              >
                                Abrir
                              </a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
