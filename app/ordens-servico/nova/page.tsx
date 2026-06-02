'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { getSupabaseBrowser } from '@/lib/supabase';
import { generateOSNumber } from '@/lib/utils';
import type { Cliente, Contrato, Profile } from '@/lib/types';

export default function NovaOSPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [responsaveis, setResponsaveis] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');

  const [form, setForm] = useState({
    cliente_id: '',
    contrato_id: '',
    titulo: '',
    descricao: '',
    tipo: 'avulso' as 'avulso' | 'mensalidade',
    valor: '',
    status: 'aberta' as 'aberta' | 'em_andamento',
    vencimento: '',
    responsavel_id: '',
    gerar_boleto: false,
    boleto_recorrente: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const [{ data: cls }, { data: profs }] = await Promise.all([
        supabase.from('clientes').select('id, razao_social, nome_fantasia').eq('ativo', true).order('razao_social'),
        supabase.from('profiles').select('*').eq('ativo', true).order('nome'),
      ]);
      setClientes((cls as Cliente[]) ?? []);
      setResponsaveis((profs as Profile[]) ?? []);
    };
    load();
  }, [supabase]);

  const loadContratos = useCallback(async (clienteId: string) => {
    if (!clienteId) { setContratos([]); return; }
    const { data } = await supabase
      .from('contratos')
      .select('id, numero, descricao, status')
      .eq('cliente_id', clienteId)
      .eq('status', 'ativo');
    setContratos((data as Contrato[]) ?? []);
  }, [supabase]);

  const handleClienteChange = (id: string) => {
    setForm((f) => ({ ...f, cliente_id: id, contrato_id: '' }));
    loadContratos(id);
    const cliente = clientes.find((c) => c.id === id);
    setClienteSearch(cliente?.razao_social ?? '');
  };

  const filteredClientes = clientes.filter((c) =>
    clienteSearch === '' ||
    c.razao_social.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.nome_fantasia ?? '').toLowerCase().includes(clienteSearch.toLowerCase())
  );

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.cliente_id) errs.cliente_id = 'Selecione um cliente';
    if (!form.titulo.trim()) errs.titulo = 'Título é obrigatório';
    if (!form.valor || isNaN(Number(form.valor)) || Number(form.valor) <= 0) errs.valor = 'Informe um valor válido';
    if (!form.vencimento) errs.vencimento = 'Informe o vencimento';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      // Generate OS number
      const { count } = await supabase.from('ordens_servico').select('*', { count: 'exact', head: true });
      const numero = generateOSNumber((count ?? 0) + 1);

      const payload = {
        cliente_id: form.cliente_id,
        contrato_id: form.contrato_id || null,
        numero,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        tipo: form.tipo,
        valor: Number(form.valor),
        status: form.status,
        vencimento: form.vencimento,
        responsavel_id: form.responsavel_id || null,
        gerar_boleto: form.gerar_boleto,
        boleto_recorrente: form.boleto_recorrente,
      };

      const { data: osData, error } = await supabase
        .from('ordens_servico')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // If gerar_boleto, call Cora API
      if (form.gerar_boleto && osData) {
        try {
          await fetch('/api/cora/criar-boleto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ordemServico: osData }),
          });
        } catch {
          toast.error('OS criada, mas houve um erro ao gerar o boleto');
        }
      }

      toast.success(`OS ${numero} criada com sucesso!`);
      router.push('/ordens-servico');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar OS';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const clienteOptions = [
    { value: '', label: 'Selecione um cliente' },
    ...filteredClientes.map((c) => ({ value: c.id, label: c.razao_social })),
  ];

  const contratoOptions = [
    { value: '', label: 'Nenhum' },
    ...contratos.map((c) => ({ value: c.id, label: `${c.numero}${c.descricao ? ' – ' + c.descricao : ''}` })),
  ];

  const responsavelOptions = [
    { value: '', label: 'Sem responsável' },
    ...responsaveis.map((p) => ({ value: p.id, label: p.nome })),
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#1E0A3C]">Nova Ordem de Serviço</h1>
            <p className="text-sm text-gray-500">Preencha os dados abaixo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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

              {/* Contrato */}
              <div className="sm:col-span-2">
                <Select
                  label="Contrato vinculado (opcional)"
                  options={contratoOptions}
                  value={form.contrato_id}
                  onChange={(e) => setForm((f) => ({ ...f, contrato_id: e.target.value }))}
                  disabled={!form.cliente_id || contratos.length === 0}
                />
              </div>

              {/* Título */}
              <div className="sm:col-span-2">
                <Input
                  label="Título *"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  error={errors.titulo}
                  placeholder="Ex: Declaração de IR 2024"
                />
              </div>

              {/* Descrição */}
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

              {/* Tipo */}
              <Select
                label="Tipo"
                options={[
                  { value: 'avulso', label: 'Avulso' },
                  { value: 'mensalidade', label: 'Mensalidade' },
                ]}
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as 'avulso' | 'mensalidade' }))}
              />

              {/* Status */}
              <Select
                label="Status"
                options={[
                  { value: 'aberta', label: 'Aberta' },
                  { value: 'em_andamento', label: 'Em Andamento' },
                ]}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'aberta' | 'em_andamento' }))}
              />

              {/* Valor */}
              <Input
                label="Valor (R$) *"
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                error={errors.valor}
                placeholder="0,00"
              />

              {/* Vencimento */}
              <Input
                label="Vencimento *"
                type="date"
                value={form.vencimento}
                onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
                error={errors.vencimento}
              />

              {/* Responsável */}
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

          {/* Boleto */}
          <Card title="Configurações de Boleto">
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.gerar_boleto}
                  onChange={(e) => setForm((f) => ({ ...f, gerar_boleto: e.target.checked, boleto_recorrente: e.target.checked ? f.boleto_recorrente : false }))}
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

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => router.back()} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Criar OS
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
