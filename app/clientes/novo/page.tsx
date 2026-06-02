'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getSupabaseBrowser } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';

type FormData = Omit<Cliente, 'id' | 'created_at'>;

const emptyForm: FormData = {
  razao_social: '',
  nome_fantasia: '',
  cnpj_cpf: '',
  email: '',
  telefone: '',
  endereco_rua: '',
  endereco_numero: '',
  endereco_bairro: '',
  endereco_cidade: '',
  endereco_estado: '',
  endereco_cep: '',
  regime_tributario: null,
  responsavel: '',
  observacoes: '',
  ativo: true,
};

const regimeOptions = [
  { value: 'Simples Nacional', label: 'Simples Nacional' },
  { value: 'Lucro Presumido', label: 'Lucro Presumido' },
  { value: 'Lucro Real', label: 'Lucro Real' },
  { value: 'MEI', label: 'MEI' },
];

export default function NovoClientePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const set = (field: keyof FormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.razao_social.trim()) newErrors.razao_social = 'Campo obrigatório';
    if (!form.cnpj_cpf.trim()) newErrors.cnpj_cpf = 'Campo obrigatório';
    if (!form.email?.trim()) newErrors.email = 'Campo obrigatório';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const supabase = getSupabaseBrowser();

    // Clean up nullish strings
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
    );

    const { error } = await supabase.from('clientes').insert([payload]);
    setLoading(false);

    if (error) {
      showToast('Erro ao criar cliente: ' + error.message, 'error');
    } else {
      showToast('Cliente criado com sucesso!');
      setTimeout(() => router.push('/clientes'), 1000);
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
            onClick={() => router.push('/clientes')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1E0A3C]">Novo Cliente</h1>
            <p className="text-sm text-gray-500">Preencha os dados do cliente</p>
          </div>
        </div>

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
              onChange={(e) =>
                set(
                  'regime_tributario',
                  e.target.value || null
                )
              }
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
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push('/clientes')}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="h-4 w-4" />
            Salvar Cliente
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
