'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Eye, Printer, Send, Plus, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { getSupabaseBrowser } from '@/lib/supabase';
import type { Contrato, Cliente } from '@/lib/types';

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

const CONTRATO_VARIABLES = [
  { key: '{{cliente_nome}}', label: 'Nome / Razão Social do cliente' },
  { key: '{{cliente_cnpj}}', label: 'CNPJ ou CPF do cliente' },
  { key: '{{valor_mensal}}', label: 'Valor mensal formatado' },
  { key: '{{data_inicio}}', label: 'Data de início do contrato' },
  { key: '{{numero_contrato}}', label: 'Número do contrato' },
  { key: '{{servicos}}', label: 'Lista de serviços prestados' },
];

function substituteVariables(html: string, contrato: Contrato, cliente: Cliente | null): string {
  const servicosHtml = contrato.servicos?.length
    ? `<ul>${contrato.servicos.map((s) => `<li>${s}</li>`).join('')}</ul>`
    : '';

  const fmtCurrency = (v: number) =>
    v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '';

  const fmtDate = (d: string | null) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '';

  return html
    .replace(/\{\{cliente_nome\}\}/g, cliente?.razao_social ?? '')
    .replace(/\{\{cliente_cnpj\}\}/g, cliente?.cnpj_cpf ?? '')
    .replace(/\{\{valor_mensal\}\}/g, fmtCurrency(contrato.valor_mensal))
    .replace(/\{\{data_inicio\}\}/g, fmtDate(contrato.data_inicio))
    .replace(/\{\{numero_contrato\}\}/g, contrato.numero ?? '')
    .replace(/\{\{servicos\}\}/g, servicosHtml);
}

export default function EditarContratoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [contratoHtml, setContratoHtml] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingSign, setSendingSign] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from('contratos')
        .select('*, cliente:clientes(*)')
        .eq('id', id)
        .single();

      if (error || !data) {
        showToast('Contrato não encontrado.', 'error');
        router.push('/contratos');
        return;
      }

      const c = data as Contrato;
      setContrato(c);
      setCliente(c.cliente ?? null);
      setContratoHtml(c.contrato_html ?? '');
      setForm({
        cliente_id: c.cliente_id,
        descricao: c.descricao ?? '',
        servicos: c.servicos?.length ? c.servicos : [''],
        valor_mensal: String(c.valor_mensal ?? ''),
        data_inicio: c.data_inicio ?? '',
        data_fim: c.data_fim ?? '',
        status: c.status,
      });
      setLoading(false);
    }
    load();
  }, [id, router]);

  const set = (field: keyof FormData, value: unknown) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const addServico = () => set('servicos', [...(form?.servicos ?? []), '']);
  const removeServico = (index: number) => {
    const updated = (form?.servicos ?? []).filter((_, i) => i !== index);
    set('servicos', updated.length === 0 ? [''] : updated);
  };
  const updateServico = (index: number, value: string) => {
    const updated = [...(form?.servicos ?? [])];
    updated[index] = value;
    set('servicos', updated);
  };

  const validate = (): boolean => {
    if (!form) return false;
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.data_inicio) newErrors.data_inicio = 'Campo obrigatório';
    if (!form.valor_mensal || isNaN(parseFloat(form.valor_mensal)))
      newErrors.valor_mensal = 'Valor inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !validate()) return;
    setSaving(true);

    const supabase = getSupabaseBrowser();
    const { error } = await supabase
      .from('contratos')
      .update({
        descricao: form.descricao || null,
        servicos: form.servicos.filter((s) => s.trim() !== ''),
        valor_mensal: parseFloat(form.valor_mensal),
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        status: form.status,
        contrato_html: contratoHtml || null,
      })
      .eq('id', id);

    setSaving(false);
    if (error) {
      showToast('Erro ao salvar: ' + error.message, 'error');
    } else {
      showToast('Contrato salvo com sucesso!');
      // Refresh local state
      if (contrato) {
        setContrato({
          ...contrato,
          descricao: form.descricao || null,
          servicos: form.servicos.filter((s) => s.trim() !== ''),
          valor_mensal: parseFloat(form.valor_mensal),
          data_inicio: form.data_inicio,
          data_fim: form.data_fim || null,
          status: form.status,
          contrato_html: contratoHtml || null,
        });
      }
    }
  };

  const handleEnviarAssinatura = async () => {
    setSendingSign(true);
    try {
      const res = await fetch('/api/zapsign/criar-documento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrato_id: id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Erro ao enviar');
      }
      showToast('Documento enviado para assinatura!');
      // Refresh contrato
      const supabase = getSupabaseBrowser();
      const { data } = await supabase
        .from('contratos')
        .select('assinatura_status, zapsign_id')
        .eq('id', id)
        .single();
      if (data && contrato) {
        setContrato({ ...contrato, ...data });
      }
    } catch (err) {
      showToast((err as Error).message ?? 'Erro ao enviar documento.', 'error');
    }
    setSendingSign(false);
  };

  const assinaturaBadgeVariant = (s: string): 'warning' | 'info' | 'success' | 'danger' => {
    const map: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
      pendente: 'warning',
      enviado: 'info',
      assinado: 'success',
      cancelado: 'danger',
    };
    return map[s] ?? 'default' as 'warning';
  };

  const previewHtml =
    contrato && form
      ? substituteVariables(contratoHtml, {
          ...contrato,
          servicos: form.servicos.filter((s) => s.trim() !== ''),
          valor_mensal: parseFloat(form.valor_mensal) || contrato.valor_mensal,
          data_inicio: form.data_inicio || contrato.data_inicio,
        }, cliente)
      : '';

  if (loading || !form || !contrato) {
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

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Pré-visualização do Contrato"
        size="lg"
        className="max-w-4xl"
      >
        <div className="max-h-[70vh] overflow-y-auto">
          {previewHtml ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">
              Nenhum conteúdo HTML para visualizar. Adicione o HTML do contrato abaixo.
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
            Fechar
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPreviewOpen(false);
              window.print();
            }}
          >
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </Button>
        </div>
      </Modal>

      {/* Print-only area */}
      <div
        id="contrato-print"
        className="hidden print:block"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />

      <form onSubmit={handleSave} className="mx-auto max-w-4xl space-y-8">
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
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1E0A3C]">
                Contrato{' '}
                <span className="font-mono text-[#8B3FD4]">{contrato.numero}</span>
              </h1>
              <Badge variant={contrato.status === 'ativo' ? 'success' : contrato.status === 'inativo' ? 'warning' : 'danger'} dot>
                {contrato.status.charAt(0).toUpperCase() + contrato.status.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              {cliente?.razao_social ?? 'Cliente não identificado'}
            </p>
          </div>
          <Button type="submit" loading={saving}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>

        {/* Dados do Contrato */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-[#8B3FD4]">Dados do Contrato</h2>

          {/* Cliente (read-only display) */}
          <div className="rounded-xl bg-[#F3EAFE]/60 px-4 py-3">
            <p className="text-xs text-gray-500">Cliente</p>
            <p className="font-semibold text-[#1E0A3C]">{cliente?.razao_social}</p>
            {cliente?.cnpj_cpf && (
              <p className="text-xs text-gray-500">{cliente.cnpj_cpf}</p>
            )}
          </div>

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
              error={errors.valor_mensal}
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
              error={errors.data_inicio}
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

        {/* Editor de Contrato */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#8B3FD4]">Editor de Contrato</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Cole ou edite o HTML do contrato. Use as variáveis abaixo para personalização dinâmica.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-3.5 w-3.5" />
                Pré-visualizar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir / PDF
              </Button>
            </div>
          </div>

          {/* Variables reference */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Variáveis disponíveis</p>
            <div className="flex flex-wrap gap-2">
              {CONTRATO_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  title={v.label}
                  onClick={() => setContratoHtml((prev) => prev + v.key)}
                  className="rounded-md bg-white border border-[#8B3FD4]/30 px-2 py-1 font-mono text-xs text-[#8B3FD4] hover:bg-[#F3EAFE] transition-colors"
                >
                  {v.key}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Clique em uma variável para inserir no editor.
            </p>
          </div>

          {/* HTML textarea */}
          <textarea
            value={contratoHtml}
            onChange={(e) => setContratoHtml(e.target.value)}
            rows={20}
            placeholder="<!-- Cole aqui o HTML do contrato -->"
            spellCheck={false}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-[#8B3FD4] focus:ring-2 focus:ring-[#8B3FD4]/20 resize-y"
          />
        </section>

        {/* Assinatura section */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-[#8B3FD4]">Assinatura Digital</h2>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Status da assinatura:</p>
              <Badge variant={assinaturaBadgeVariant(contrato.assinatura_status)} dot>
                {contrato.assinatura_status.charAt(0).toUpperCase() +
                  contrato.assinatura_status.slice(1)}
              </Badge>
              {contrato.zapsign_id && (
                <p className="text-xs text-gray-400 mt-1">
                  ZapSign ID: <span className="font-mono">{contrato.zapsign_id}</span>
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              loading={sendingSign}
              onClick={handleEnviarAssinatura}
              disabled={contrato.assinatura_status === 'assinado'}
              title={
                contrato.assinatura_status === 'assinado'
                  ? 'Documento já assinado'
                  : 'Enviar para assinatura via ZapSign'
              }
            >
              <Send className="h-4 w-4" />
              Enviar para Assinatura
            </Button>
          </div>

          {contrato.assinatura_status === 'assinado' && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm text-green-700 font-medium">
                Contrato assinado com sucesso por todas as partes.
              </p>
            </div>
          )}
        </section>

        {/* Bottom save */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Button type="button" variant="secondary" onClick={() => router.push('/contratos')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            <Save className="h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
