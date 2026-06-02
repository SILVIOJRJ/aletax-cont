'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getSupabaseBrowser } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';

interface FormData {
  cliente_id: string;
  descricao: string;
  servicos: string[];
  valor_mensal: string;
  data_inicio: string;
  data_fim: string;
  status: 'ativo' | 'inativo' | 'encerrado';
}

const statusOptions = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'encerrado', label: 'Encerrado' },
];

function NovoContratoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledClienteId = searchParams.get('cliente_id') ?? '';

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const [form, setForm] = useState<FormData>({
    cliente_id: prefilledClienteId,
    descricao: '',
    servicos: [''],
    valor_mensal: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativo',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'servicos_item', string>>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load clientes ativos
  useEffect(() => {
    async function loadClientes() {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase
        .from('clientes')
        .select('id, razao_social, cnpj_cpf, nome_fantasia')
        .eq('ativo', true)
        .order('razao_social');
      setClientes((data as Cliente[]) ?? []);

      // Pre-select if came from cliente page
      if (prefilledClienteId && data) {
        const found = (data as Cliente[]).find((c) => c.id === prefilledClienteId);
        if (found) {
          setSelectedCliente(found);
          setClienteSearch(found.razao_social);
        }
      }
    }
    loadClientes();
  }, [prefilledClienteId]);

  const set = (field: keyof FormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const filteredClientes = clientes.filter((c) =>
    c.razao_social.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.cnpj_cpf && c.cnpj_cpf.includes(clienteSearch))
  );

  const handleSelectCliente = (c: Cliente) => {
    setSelectedCliente(c);
    set('cliente_id', c.id);
    setClienteSearch(c.razao_social);
    setShowClienteDropdown(false);
  };

  // Serviços dynamic list
  const addServico = () => set('servicos', [...form.servicos, '']);
  const removeServico = (index: number) => {
    const updated = form.servicos.filter((_, i) => i !== index);
    set('servicos', updated.length === 0 ? [''] : updated);
  };
  const updateServico = (index: number, value: string) => {
    const updated = [...form.servicos];
    updated[index] = value;
    set('servicos', updated);
  };

  // Auto-generate numero
  async function generateNumero(): Promise<string> {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from('contratos')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return `CONT-${new Date().getFullYear()}-0001`;
    }

    const last = data[0].numero as string;
    const match = last.match(/(\d+)$/);
    const nextNum = match ? parseInt(match[1], 10) + 1 : 1;
    const year = new Date().getFullYear();
    return `CONT-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData | 'servicos_item', string>> = {};
    if (!form.cliente_id) newErrors.cliente_id = 'Selecione um cliente';
    if (!form.data_inicio) newErrors.data_inicio = 'Campo obrigatório';
    if (!form.valor_mensal || isNaN(parseFloat(form.valor_mensal)))
      newErrors.valor_mensal = 'Valor inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const numero = await generateNumero();
      const supabase = getSupabaseBrowser();

      const payload = {
        cliente_id: form.cliente_id,
        numero,
        descricao: form.descricao || null,
        servicos: form.servicos.filter((s) => s.trim() !== ''),
        valor_mensal: parseFloat(form.valor_mensal),
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        status: form.status,
        assinatura_status: 'pendente',
        contrato_html: null,
        zapsign_id: null,
      };

      const { data, error } = await supabase
        .from('contratos')
        .insert([payload])
        .select('id')
        .single();

      if (error) {
        showToast('Erro ao criar contrato: ' + error.message, 'error');
        setLoading(false);
        return;
      }

      showToast('Contrato criado! Redirecionando...');
      setTimeout(() => router.push(`/contratos/${data.id}`), 800);
    } catch (err) {
      showToast('Erro inesperado.', 'error');
      setLoading(false);
    }
  };

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

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/contratos')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1E0A3C]">Novo Contrato</h1>
            <p className="text-sm text-gray-500">Preencha os dados do contrato</p>
          </div>
        </div>

        {/* Dados do Contrato */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-[#8B3FD4]">Dados do Contrato</h2>

          {/* Cliente searchable select */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-sm font-medium text-[#1E0A3C]">Cliente *</label>
            <input
              type="text"
              value={clienteSearch}
              onChange={(e) => {
                setClienteSearch(e.target.value);
                setShowClienteDropdown(true);
                if (!e.target.value) {
                  setSelectedCliente(null);
                  set('cliente_id', '');
                }
              }}
              onFocus={() => setShowClienteDropdown(true)}
              placeholder="Buscar cliente por nome ou CNPJ..."
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#1E0A3C] placeholder-gray-400 outline-none transition-colors focus:ring-2 focus:ring-offset-0 ${
                errors.cliente_id
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                  : 'border-gray-200 focus:border-[#8B3FD4] focus:ring-[#8B3FD4]/20'
              }`}
            />
            {errors.cliente_id && (
              <p className="text-xs text-red-600">{errors.cliente_id}</p>
            )}

            {showClienteDropdown && clienteSearch && filteredClientes.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {filteredClientes.slice(0, 10).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => handleSelectCliente(c)}
                    className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-[#F3EAFE] transition-colors"
                  >
                    <span className="text-sm font-medium text-[#1E0A3C]">{c.razao_social}</span>
                    {c.cnpj_cpf && (
                      <span className="text-xs text-gray-400">{c.cnpj_cpf}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {showClienteDropdown && clienteSearch && filteredClientes.length === 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
                <p className="text-sm text-gray-400">Nenhum cliente encontrado.</p>
              </div>
            )}
          </div>

          {/* Click outside to close dropdown */}
          {showClienteDropdown && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowClienteDropdown(false)}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Descrição"
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
              placeholder="Ex: Assessoria Contábil Mensal"
              containerClassName="sm:col-span-2"
            />
            <Input
              label="Valor Mensal (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={form.valor_mensal}
              onChange={(e) => set('valor_mensal', e.target.value)}
              error={errors.valor_mensal as string}
              placeholder="0,00"
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as FormData['status'])}
              options={statusOptions}
            />
            <Input
              label="Data de Início *"
              type="date"
              value={form.data_inicio}
              onChange={(e) => set('data_inicio', e.target.value)}
              error={errors.data_inicio as string}
            />
            <Input
              label="Data de Fim (opcional)"
              type="date"
              value={form.data_fim}
              onChange={(e) => set('data_fim', e.target.value)}
            />
          </div>
        </section>

        {/* Serviços */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#8B3FD4]">Serviços Prestados</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addServico}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            Liste os serviços incluídos neste contrato.
          </p>
          <div className="space-y-2">
            {form.servicos.map((servico, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F3EAFE] text-xs font-medium text-[#8B3FD4]">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={servico}
                  onChange={(e) => updateServico(index, e.target.value)}
                  placeholder={`Serviço ${index + 1}`}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E0A3C] placeholder-gray-400 outline-none transition-colors focus:border-[#8B3FD4] focus:ring-2 focus:ring-[#8B3FD4]/20"
                />
                {form.servicos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeServico(index)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    aria-label="Remover serviço"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push('/contratos')}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="h-4 w-4" />
            Criar Contrato
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

export default function NovoContratoPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8B3FD4] border-t-transparent" /></div>}>
      <NovoContratoForm />
    </Suspense>
  );
}
