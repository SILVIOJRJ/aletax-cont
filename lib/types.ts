// ─── Auth & Users ────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  user_id: string;
  role: "admin" | "funcionario";
  modulos: string[];
  nome: string;
  ativo: boolean;
  created_at: string;
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export interface Cliente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string;
  email: string | null;
  telefone: string | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  endereco_cep: string | null;
  regime_tributario:
    | "Simples Nacional"
    | "Lucro Presumido"
    | "Lucro Real"
    | "MEI"
    | null;
  responsavel: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

// ─── Contratos ────────────────────────────────────────────────────────────────

export type AssinaturaStatus =
  | "pendente"
  | "enviado"
  | "aguardando"
  | "assinado"
  | "recusado"
  | "cancelado";

export interface Contrato {
  id: string;
  cliente_id: string;
  numero: string;
  descricao: string | null;
  servicos: string[];
  valor_mensal: number;
  data_inicio: string;
  data_fim: string | null;
  status: "ativo" | "inativo" | "encerrado";
  contrato_html: string | null;
  zapsign_id: string | null;
  assinatura_status: AssinaturaStatus;
  created_at: string;
  // Relations
  cliente?: Cliente;
}

// ─── Ordens de Serviço ────────────────────────────────────────────────────────

export type OSStatus =
  | "aberta"
  | "em_andamento"
  | "concluida"
  | "cancelada";

export interface OrdemServico {
  id: string;
  cliente_id: string;
  contrato_id: string | null;
  numero: string;
  titulo: string;
  descricao: string | null;
  tipo: "avulso" | "mensalidade";
  valor: number;
  status: OSStatus;
  vencimento: string;
  responsavel_id: string | null;
  gerar_boleto: boolean;
  boleto_recorrente: boolean;
  created_at: string;
  // Relations
  cliente?: Cliente;
}

// ─── Boletos ──────────────────────────────────────────────────────────────────

export type BoletoStatus =
  | "pendente"
  | "emitido"
  | "pago"
  | "vencido"
  | "cancelado";

export interface Boleto {
  id: string;
  ordem_servico_id: string;
  cliente_id: string;
  cora_id: string | null;
  numero_documento: string | null;
  valor: number;
  vencimento: string;
  status: BoletoStatus;
  linha_digitavel: string | null;
  url_boleto: string | null;
  created_at: string;
  // Relations
  cliente?: Cliente;
  ordem_servico?: OrdemServico;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
