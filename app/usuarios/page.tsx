'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, UserCheck, UserX } from 'lucide-react';

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getSupabaseBrowser } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const ALL_MODULOS = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'ordens_servico', label: 'Ordens de Serviço' },
  { key: 'boletos', label: 'Boletos' },
  { key: 'relatorios', label: 'Relatórios' },
];

interface ProfileWithEmail extends Profile {
  email?: string;
}

export default function UsuariosPage() {
  const supabase = getSupabaseBrowser();

  const [profiles, setProfiles] = useState<ProfileWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Novo usuário modal
  const [novoModal, setNovoModal] = useState(false);
  const [novoForm, setNovoForm] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'funcionario' as 'admin' | 'funcionario',
    modulos: [] as string[],
  });
  const [novoErrors, setNovoErrors] = useState<Record<string, string>>({});
  const [novoLoading, setNovoLoading] = useState(false);

  // Editar permissões modal
  const [editModal, setEditModal] = useState<ProfileWithEmail | null>(null);
  const [editModulos, setEditModulos] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar usuários');
    } else {
      setProfiles((data as ProfileWithEmail[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // Toggle ativo/inativo
  const handleToggleAtivo = async (profile: ProfileWithEmail) => {
    setActionLoadingId(profile.id);
    const { error } = await supabase
      .from('profiles')
      .update({ ativo: !profile.ativo })
      .eq('id', profile.id);

    if (error) {
      toast.error('Erro ao atualizar status do usuário');
    } else {
      toast.success(`Usuário ${profile.ativo ? 'desativado' : 'ativado'} com sucesso`);
      await fetchProfiles();
    }
    setActionLoadingId(null);
  };

  // Abrir editar permissões
  const openEditModal = (profile: ProfileWithEmail) => {
    setEditModal(profile);
    setEditModulos([...(profile.modulos ?? [])]);
  };

  const handleSavePermissoes = async () => {
    if (!editModal) return;
    setEditLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ modulos: editModulos })
      .eq('id', editModal.id);

    if (error) {
      toast.error('Erro ao salvar permissões');
    } else {
      toast.success('Permissões atualizadas!');
      setEditModal(null);
      await fetchProfiles();
    }
    setEditLoading(false);
  };

  const toggleModulo = (key: string, checked: boolean, list: string[], setter: (v: string[]) => void) => {
    if (checked) {
      setter([...list, key]);
    } else {
      setter(list.filter((m) => m !== key));
    }
  };

  // Criar novo usuário
  const validateNovo = () => {
    const errs: Record<string, string> = {};
    if (!novoForm.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!novoForm.email.trim()) errs.email = 'Email é obrigatório';
    if (!novoForm.senha || novoForm.senha.length < 6) errs.senha = 'Senha deve ter ao menos 6 caracteres';
    setNovoErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateNovo()) return;
    setNovoLoading(true);

    try {
      const res = await fetch('/api/usuarios/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoForm.nome.trim(),
          email: novoForm.email.trim(),
          password: novoForm.senha,
          role: novoForm.role,
          modulos: novoForm.modulos,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar usuário');

      toast.success('Usuário criado com sucesso!');
      setNovoModal(false);
      setNovoForm({ nome: '', email: '', senha: '', role: 'funcionario', modulos: [] });
      await fetchProfiles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setNovoLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1E0A3C]">Usuários</h1>
            <p className="mt-1 text-sm text-gray-500">{profiles.length} usuário(s) cadastrado(s)</p>
          </div>
          <Button onClick={() => setNovoModal(true)}>
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Table */}
        <Table loading={loading} emptyMessage="Nenhum usuário cadastrado.">
          <Thead>
            <tr>
              <Th>Nome</Th>
              <Th>Role</Th>
              <Th>Módulos</Th>
              <Th>Status</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <Tbody>
            {!loading && profiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            ) : (
              profiles.map((p, idx) => (
                <Tr key={p.id} zebra index={idx}>
                  <Td>
                    <p className="font-medium text-[#1E0A3C]">{p.nome}</p>
                  </Td>
                  <Td>
                    <Badge variant={p.role === 'admin' ? 'purple' : 'default'}>
                      {p.role === 'admin' ? 'Admin' : 'Funcionário'}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {p.role === 'admin' ? (
                        <Badge variant="purple">Todos</Badge>
                      ) : (p.modulos ?? []).length === 0 ? (
                        <span className="text-xs text-gray-400">Nenhum</span>
                      ) : (
                        (p.modulos ?? []).map((m) => (
                          <Badge key={m} variant="info">
                            {ALL_MODULOS.find((mod) => mod.key === m)?.label ?? m}
                          </Badge>
                        ))
                      )}
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={p.ativo ? 'success' : 'danger'} dot>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(p)}
                        title="Editar permissões"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={p.ativo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}
                        onClick={() => handleToggleAtivo(p)}
                        loading={actionLoadingId === p.id}
                        title={p.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {p.ativo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </div>

      {/* Novo Usuário Modal */}
      <Modal
        open={novoModal}
        onClose={() => !novoLoading && setNovoModal(false)}
        title="Novo Usuário"
        size="md"
      >
        <form onSubmit={handleCriarUsuario} className="space-y-4">
          <Input
            label="Nome *"
            value={novoForm.nome}
            onChange={(e) => setNovoForm((f) => ({ ...f, nome: e.target.value }))}
            error={novoErrors.nome}
            placeholder="Nome completo"
          />
          <Input
            label="Email *"
            type="email"
            value={novoForm.email}
            onChange={(e) => setNovoForm((f) => ({ ...f, email: e.target.value }))}
            error={novoErrors.email}
            placeholder="email@exemplo.com"
          />
          <Input
            label="Senha temporária *"
            type="password"
            value={novoForm.senha}
            onChange={(e) => setNovoForm((f) => ({ ...f, senha: e.target.value }))}
            error={novoErrors.senha}
            placeholder="Mínimo 6 caracteres"
          />
          <Select
            label="Role"
            options={[
              { value: 'funcionario', label: 'Funcionário' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={novoForm.role}
            onChange={(e) => setNovoForm((f) => ({ ...f, role: e.target.value as 'admin' | 'funcionario' }))}
          />

          {novoForm.role === 'funcionario' && (
            <div>
              <p className="mb-2 text-sm font-medium text-[#1E0A3C]">Módulos</p>
              <div className="space-y-2">
                {ALL_MODULOS.map((mod) => (
                  <label key={mod.key} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={novoForm.modulos.includes(mod.key)}
                      onChange={(e) =>
                        toggleModulo(mod.key, e.target.checked, novoForm.modulos, (v) =>
                          setNovoForm((f) => ({ ...f, modulos: v }))
                        )
                      }
                      className="h-4 w-4 rounded border-gray-300 text-[#8B3FD4] focus:ring-[#8B3FD4]"
                    />
                    <span className="text-sm text-[#1E0A3C]">{mod.label}</span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-2 opacity-60">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="h-4 w-4 rounded border-gray-300 text-[#8B3FD4]"
                  />
                  <span className="text-sm text-[#1E0A3C]">Usuários (apenas admin)</span>
                </label>
              </div>
            </div>
          )}

          {novoForm.role === 'admin' && (
            <p className="rounded-lg bg-[#F3EAFE] px-3 py-2 text-xs text-[#8B3FD4]">
              Admins têm acesso a todos os módulos automaticamente.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setNovoModal(false)}
              disabled={novoLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={novoLoading}>
              Criar Usuário
            </Button>
          </div>
        </form>
      </Modal>

      {/* Editar Permissões Modal */}
      <Modal
        open={!!editModal}
        onClose={() => !editLoading && setEditModal(null)}
        title="Editar Permissões"
        size="sm"
      >
        {editModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Configurando módulos para <strong>{editModal.nome}</strong>
            </p>

            {editModal.role === 'admin' ? (
              <p className="rounded-lg bg-[#F3EAFE] px-3 py-2 text-xs text-[#8B3FD4]">
                Admins têm acesso a todos os módulos automaticamente.
              </p>
            ) : (
              <div className="space-y-2">
                {ALL_MODULOS.map((mod) => (
                  <label key={mod.key} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editModulos.includes(mod.key)}
                      onChange={(e) =>
                        toggleModulo(mod.key, e.target.checked, editModulos, setEditModulos)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-[#8B3FD4] focus:ring-[#8B3FD4]"
                    />
                    <span className="text-sm text-[#1E0A3C]">{mod.label}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditModal(null)}
                disabled={editLoading}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                loading={editLoading}
                onClick={handleSavePermissoes}
                disabled={editModal.role === 'admin'}
              >
                Salvar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
