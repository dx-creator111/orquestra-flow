import { z } from "zod";

/** Internal block contracts of Orquestra Flow. Pure module (shared by client + server). */

export type BlockGroup = "Mensagens" | "Lógica" | "IA" | "Dados/CRM" | "Integrações" | "Pagamentos" | "Marketing";
export const GROUPS: BlockGroup[] = ["Mensagens", "Lógica", "IA", "Dados/CRM", "Integrações", "Pagamentos", "Marketing"];

export type FieldType = "text" | "textarea" | "number" | "select" | "switch" | "keyvalue" | "rules" | "options" | "json" | "agent";
export interface Field {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
}
export type OutputTone = "default" | "success" | "error" | "warning";
export interface OutputPort { id: string; label: string; tone: OutputTone }

export interface BlockDef {
  kind: string;
  label: string;
  group: BlockGroup;
  description: string;
  isTrigger?: boolean;
  terminal?: boolean;
  /** Integration kind required for real execution. */
  integration?: string;
  fields: Field[];
  schema: z.ZodType<Record<string, unknown>>;
  defaults: () => Record<string, unknown>;
  outputs: (config: Record<string, unknown>) => OutputPort[];
  summary: (config: Record<string, unknown>) => string;
  /** Required outputs that must be connected (others produce warnings). */
  requiredOutputs?: string[];
}

const kv = z.array(z.object({ key: z.string(), value: z.string() }));
const NEXT: OutputPort[] = [{ id: "next", label: "Próximo", tone: "default" }];
const SUCCESS_ERR: OutputPort[] = [
  { id: "success", label: "Sucesso", tone: "success" },
  { id: "error", label: "Erro", tone: "error" },
];
const s = (v: unknown) => (typeof v === "string" ? v : "");
const trunc = (t: string, n = 60) => (t.length > n ? t.slice(0, n) + "…" : t);
const opt = (...v: [string, string][]) => v.map(([value, label]) => ({ value, label }));

const defs: BlockDef[] = [
  {
    kind: "start", label: "Início", group: "Lógica", isTrigger: true,
    description: "Gatilho inicial do fluxo",
    fields: [
      { name: "trigger", label: "Gatilho", type: "select", options: opt(["manual", "Manual / teste"], ["keyword", "Palavra-chave"], ["new_contact", "Novo contato"]) },
      { name: "keyword", label: "Palavra-chave", type: "text", placeholder: "ex.: oi", help: "Usado quando o gatilho é palavra-chave" },
      { name: "variables", label: "Variáveis iniciais", type: "keyvalue" },
    ],
    schema: z.object({ trigger: z.enum(["manual", "keyword", "new_contact"]), keyword: z.string().optional(), variables: kv.default([]) })
      .refine((c) => c.trigger !== "keyword" || !!c.keyword?.trim(), { message: "Informe a palavra-chave", path: ["keyword"] }),
    defaults: () => ({ trigger: "manual", keyword: "", variables: [] }),
    outputs: () => NEXT, requiredOutputs: ["next"],
    summary: (c) => (c.trigger === "keyword" ? `Palavra-chave: “${s(c.keyword)}”` : c.trigger === "new_contact" ? "Novo contato" : "Disparo manual"),
  },
  {
    kind: "webhook_trigger", label: "Gatilho Webhook", group: "Integrações", isTrigger: true,
    description: "Inicia quando um webhook é recebido",
    fields: [{ name: "endpoint_name", label: "Nome do endpoint", type: "text", help: "Crie endpoints em Webhooks" }],
    schema: z.object({ endpoint_name: z.string().min(1, "Obrigatório") }),
    defaults: () => ({ endpoint_name: "" }),
    outputs: () => NEXT, requiredOutputs: ["next"],
    summary: (c) => (s(c.endpoint_name) ? `Endpoint: ${s(c.endpoint_name)}` : "Sem endpoint"),
  },
  {
    kind: "message", label: "Mensagem", group: "Mensagens",
    description: "Envia texto e mídia",
    fields: [
      { name: "text", label: "Texto", type: "textarea", placeholder: "Olá, {first_name}!", help: "Variáveis: {first_name} {full_name} {phone_number} {last_message} {sua_variavel}" },
      { name: "media_url", label: "URL de mídia (opcional)", type: "text", placeholder: "https://…" },
    ],
    schema: z.object({ text: z.string().trim().min(1, "Texto obrigatório").max(4096), media_url: z.union([z.literal(""), z.string().url("URL inválida")]).optional() }),
    defaults: () => ({ text: "", media_url: "" }),
    outputs: () => NEXT,
    summary: (c) => trunc(s(c.text) || "Sem texto"),
  },
  {
    kind: "wait_response", label: "Aguardar resposta", group: "Mensagens",
    description: "Salva a resposta em variável",
    fields: [
      { name: "variable", label: "Salvar em variável", type: "text", placeholder: "resposta" },
      { name: "timeout_minutes", label: "Timeout (minutos)", type: "number" },
    ],
    schema: z.object({ variable: z.string().regex(/^[a-zA-Z_]\w*$/, "Nome de variável inválido"), timeout_minutes: z.coerce.number().int().min(1).max(10080) }),
    defaults: () => ({ variable: "resposta", timeout_minutes: 60 }),
    outputs: () => [{ id: "reply", label: "Resposta", tone: "success" }, { id: "timeout", label: "Timeout", tone: "warning" }],
    requiredOutputs: ["reply"],
    summary: (c) => `→ {${s(c.variable)}} · ${c.timeout_minutes ?? "?"} min`,
  },
  {
    kind: "menu", label: "Menu de opções", group: "Mensagens",
    description: "Opções numeradas com portas por opção",
    fields: [
      { name: "text", label: "Pergunta", type: "textarea" },
      { name: "options", label: "Opções", type: "options" },
      { name: "variable", label: "Salvar escolha em", type: "text" },
      { name: "timeout_minutes", label: "Timeout (minutos)", type: "number" },
    ],
    schema: z.object({
      text: z.string().trim().min(1, "Pergunta obrigatória"),
      options: z.array(z.string().trim().min(1, "Opção vazia")).min(1, "Adicione ao menos uma opção").max(10),
      variable: z.string().regex(/^[a-zA-Z_]\w*$/, "Nome de variável inválido"),
      timeout_minutes: z.coerce.number().int().min(1),
    }),
    defaults: () => ({ text: "Escolha uma opção:", options: ["Opção 1", "Opção 2"], variable: "escolha", timeout_minutes: 60 }),
    outputs: (c) => [
      ...((Array.isArray(c.options) ? c.options : []) as string[]).map((o, i) => ({ id: `opt_${i}`, label: `${i + 1}. ${trunc(o, 18)}`, tone: "default" as const })),
      { id: "timeout", label: "Timeout / inválido", tone: "warning" },
    ],
    summary: (c) => `${(c.options as string[] | undefined)?.length ?? 0} opções`,
  },
  {
    kind: "notification", label: "Notificação", group: "Mensagens",
    description: "Alerta interno para a equipe",
    fields: [
      { name: "channel", label: "Canal", type: "select", options: opt(["internal", "Registro interno"], ["email", "E-mail (requer integração)"]) },
      { name: "recipient", label: "Destinatário", type: "text" },
      { name: "text", label: "Mensagem", type: "textarea" },
    ],
    schema: z.object({ channel: z.enum(["internal", "email"]), recipient: z.string().optional(), text: z.string().min(1, "Obrigatório") }),
    defaults: () => ({ channel: "internal", recipient: "", text: "" }),
    outputs: () => NEXT,
    summary: (c) => `${c.channel === "email" ? "E-mail" : "Interno"}: ${trunc(s(c.text), 40)}`,
  },
  {
    kind: "condition", label: "Condição", group: "Lógica",
    description: "Regras E/OU com saídas sim/não",
    fields: [
      { name: "logic", label: "Combinar regras", type: "select", options: opt(["and", "Todas (E)"], ["or", "Qualquer (OU)"]) },
      { name: "rules", label: "Regras", type: "rules" },
    ],
    schema: z.object({
      logic: z.enum(["and", "or"]),
      rules: z.array(z.object({ left: z.string().min(1, "Lado esquerdo vazio"), operator: z.enum(["equal", "not_equal", "contains", "greater_than", "less_than", "is_empty"]), right: z.string() })).min(1, "Adicione uma regra"),
    }),
    defaults: () => ({ logic: "and", rules: [{ left: "{last_message}", operator: "contains", right: "" }] }),
    outputs: () => [{ id: "true", label: "Verdadeiro", tone: "success" }, { id: "false", label: "Falso", tone: "error" }],
    requiredOutputs: ["true", "false"],
    summary: (c) => {
      const r = (c.rules as { left: string; operator: string; right: string }[] | undefined) ?? [];
      if (!r.length) return "Sem regras";
      const f = r[0];
      return `${f.left} ${OPS[f.operator] ?? f.operator} ${f.right}${r.length > 1 ? ` +${r.length - 1}` : ""}`;
    },
  },
  {
    kind: "delay", label: "Atraso", group: "Lógica",
    description: "Espera um tempo antes de continuar",
    fields: [
      { name: "amount", label: "Quantidade", type: "number" },
      { name: "unit", label: "Unidade", type: "select", options: opt(["seconds", "Segundos"], ["minutes", "Minutos"], ["hours", "Horas"], ["days", "Dias"]) },
    ],
    schema: z.object({ amount: z.coerce.number().int().min(1), unit: z.enum(["seconds", "minutes", "hours", "days"]) }),
    defaults: () => ({ amount: 5, unit: "minutes" }),
    outputs: () => NEXT, requiredOutputs: ["next"],
    summary: (c) => `Aguardar ${c.amount} ${UNITS[s(c.unit)] ?? ""}`,
  },
  {
    kind: "smart_interval", label: "Intervalo inteligente", group: "Lógica",
    description: "Espera aleatória entre mínimo e máximo",
    fields: [
      { name: "min_minutes", label: "Mínimo (min)", type: "number" },
      { name: "max_minutes", label: "Máximo (min)", type: "number" },
      { name: "business_hours", label: "Somente horário comercial", type: "switch" },
    ],
    schema: z.object({ min_minutes: z.coerce.number().min(0), max_minutes: z.coerce.number().min(1), business_hours: z.boolean() })
      .refine((c) => c.max_minutes >= c.min_minutes, { message: "Máximo deve ser ≥ mínimo", path: ["max_minutes"] }),
    defaults: () => ({ min_minutes: 1, max_minutes: 5, business_hours: false }),
    outputs: () => NEXT, requiredOutputs: ["next"],
    summary: (c) => `${c.min_minutes}–${c.max_minutes} min${c.business_hours ? " · comercial" : ""}`,
  },
  {
    kind: "connection_flow", label: "Conectar fluxo", group: "Lógica",
    description: "Continua em outro fluxo",
    fields: [{ name: "target_flow_id", label: "ID do fluxo de destino", type: "text", help: "Copie o ID na listagem de fluxos" }],
    schema: z.object({ target_flow_id: z.string().uuid("ID de fluxo inválido") }),
    defaults: () => ({ target_flow_id: "" }),
    outputs: () => [], terminal: true,
    summary: (c) => (s(c.target_flow_id) ? `→ ${s(c.target_flow_id).slice(0, 8)}…` : "Sem destino"),
  },
  {
    kind: "end", label: "Fim", group: "Lógica", terminal: true,
    description: "Encerra o fluxo",
    fields: [], schema: z.object({}).passthrough(), defaults: () => ({}),
    outputs: () => [], summary: () => "Encerra a execução",
  },
  {
    kind: "ai", label: "IA (prompt)", group: "IA",
    description: "Gera resposta com modelo de IA no servidor",
    fields: [
      { name: "provider", label: "Provedor", type: "select", options: opt(["lovable", "IA integrada (Lovable AI)"], ["openai", "OpenAI (chave própria)"]) },
      { name: "model", label: "Modelo", type: "text", placeholder: "google/gemini-3-flash-preview" },
      { name: "system_prompt", label: "Instruções de sistema", type: "textarea" },
      { name: "user_message", label: "Mensagem do usuário", type: "textarea", placeholder: "{last_message}" },
      { name: "output_variable", label: "Salvar resposta em", type: "text" },
    ],
    schema: z.object({
      provider: z.enum(["lovable", "openai"]), model: z.string().min(1, "Modelo obrigatório"),
      system_prompt: z.string().max(8000), user_message: z.string().min(1, "Obrigatório"),
      output_variable: z.string().regex(/^[a-zA-Z_]\w*$/, "Nome de variável inválido"),
    }),
    defaults: () => ({ provider: "lovable", model: "google/gemini-3-flash-preview", system_prompt: "Você é um atendente cordial.", user_message: "{last_message}", output_variable: "resposta_ia" }),
    outputs: () => SUCCESS_ERR, requiredOutputs: ["success"],
    summary: (c) => `${s(c.model)} → {${s(c.output_variable)}}`,
  },
  {
    kind: "ai_agent", label: "Agente IA", group: "IA",
    description: "Ativa um agente cadastrado",
    fields: [
      { name: "agent_id", label: "Agente", type: "agent" },
      { name: "user_message", label: "Mensagem", type: "textarea", placeholder: "{last_message}" },
      { name: "output_variable", label: "Salvar resposta em", type: "text" },
    ],
    schema: z.object({ agent_id: z.string().uuid("Selecione um agente"), user_message: z.string().min(1), output_variable: z.string().regex(/^[a-zA-Z_]\w*$/, "Nome inválido") }),
    defaults: () => ({ agent_id: "", user_message: "{last_message}", output_variable: "resposta_agente" }),
    outputs: () => SUCCESS_ERR, requiredOutputs: ["success"],
    summary: (c) => (s(c.agent_id) ? `Agente ${s(c.agent_id).slice(0, 8)}…` : "Nenhum agente"),
  },
  {
    kind: "kieai_generate", label: "Gerar mídia (KIE AI)", group: "IA", integration: "kieai",
    description: "Música, áudio, imagem ou vídeo",
    fields: [
      { name: "media_type", label: "Tipo", type: "select", options: opt(["music", "Música"], ["audio", "Áudio"], ["image", "Imagem"], ["video", "Vídeo"]) },
      { name: "prompt", label: "Prompt", type: "textarea" },
      { name: "output_variable", label: "Salvar URL em", type: "text" },
    ],
    schema: z.object({ media_type: z.enum(["music", "audio", "image", "video"]), prompt: z.string().min(1, "Obrigatório"), output_variable: z.string().regex(/^[a-zA-Z_]\w*$/) }),
    defaults: () => ({ media_type: "image", prompt: "", output_variable: "midia_url" }),
    outputs: () => SUCCESS_ERR,
    summary: (c) => `${s(c.media_type)}: ${trunc(s(c.prompt), 36)}`,
  },
  {
    kind: "set_variable", label: "Definir variável", group: "Dados/CRM",
    description: "Atributos e variáveis do contato",
    fields: [{ name: "assignments", label: "Atribuições", type: "keyvalue", help: "Valores aceitam interpolação {var}" }],
    schema: z.object({ assignments: z.array(z.object({ key: z.string().regex(/^[a-zA-Z_]\w*$/, "Nome inválido"), value: z.string() })).min(1, "Adicione uma atribuição") }),
    defaults: () => ({ assignments: [{ key: "", value: "" }] }),
    outputs: () => NEXT,
    summary: (c) => ((c.assignments as { key: string }[] | undefined) ?? []).map((a) => a.key).filter(Boolean).join(", ") || "Nenhuma",
  },
  {
    kind: "tags", label: "Etiquetas", group: "Dados/CRM",
    description: "Inserir ou remover etiquetas",
    fields: [
      { name: "action", label: "Ação", type: "select", options: opt(["add", "Adicionar"], ["remove", "Remover"]) },
      { name: "tags", label: "Etiquetas (separadas por vírgula)", type: "text" },
    ],
    schema: z.object({ action: z.enum(["add", "remove"]), tags: z.string().trim().min(1, "Informe ao menos uma etiqueta") }),
    defaults: () => ({ action: "add", tags: "" }),
    outputs: () => NEXT,
    summary: (c) => `${c.action === "remove" ? "−" : "+"} ${s(c.tags) || "—"}`,
  },
  {
    kind: "kanban", label: "Mover card (CRM)", group: "Dados/CRM",
    description: "Move o card do contato no kanban",
    fields: [
      { name: "pipeline_name", label: "Pipeline", type: "text" },
      { name: "stage_name", label: "Etapa destino", type: "text" },
    ],
    schema: z.object({ pipeline_name: z.string().min(1, "Obrigatório"), stage_name: z.string().min(1, "Obrigatório") }),
    defaults: () => ({ pipeline_name: "", stage_name: "" }),
    outputs: () => SUCCESS_ERR,
    summary: (c) => `${s(c.pipeline_name) || "?"} → ${s(c.stage_name) || "?"}`,
  },
  {
    kind: "http_request", label: "Requisição HTTP", group: "Integrações",
    description: "Chamada HTTP no servidor (com proteção SSRF)",
    fields: [
      { name: "method", label: "Método", type: "select", options: opt(["GET", "GET"], ["POST", "POST"], ["PUT", "PUT"], ["PATCH", "PATCH"], ["DELETE", "DELETE"]) },
      { name: "url", label: "URL (https)", type: "text", placeholder: "https://api.exemplo.com/clientes" },
      { name: "headers", label: "Cabeçalhos", type: "keyvalue" },
      { name: "body", label: "Corpo JSON", type: "json" },
      { name: "mapping", label: "Mapear resposta → variável", type: "keyvalue", help: "Chave = variável, valor = caminho (ex.: data.id)" },
    ],
    schema: z.object({
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
      url: z.string().min(1, "URL obrigatória").refine((u) => /^https:\/\//i.test(u) || /^https:\/\/\{/.test(u), "Use https://"),
      headers: kv.default([]), body: z.string().optional().refine((b) => { if (!b?.trim()) return true; try { JSON.parse(b); return true; } catch { return false; } }, "JSON inválido"),
      mapping: kv.default([]),
    }),
    defaults: () => ({ method: "GET", url: "", headers: [], body: "", mapping: [] }),
    outputs: () => SUCCESS_ERR, requiredOutputs: ["success"],
    summary: (c) => `${s(c.method)} ${trunc(s(c.url).replace(/^https?:\/\//, ""), 40) || "—"}`,
  },
  {
    kind: "payment", label: "Cobrança", group: "Pagamentos", integration: "payment",
    description: "Cria cobrança via gateway configurado",
    fields: [
      { name: "gateway", label: "Gateway", type: "select", options: opt(["mercadopago", "Mercado Pago"], ["asaas", "Asaas"], ["stripe", "Stripe"]) },
      { name: "method", label: "Método", type: "select", options: opt(["pix", "Pix"], ["boleto", "Boleto"], ["card", "Cartão"]) },
      { name: "amount", label: "Valor (R$)", type: "number" },
      { name: "description", label: "Descrição", type: "text" },
    ],
    schema: z.object({ gateway: z.enum(["mercadopago", "asaas", "stripe"]), method: z.enum(["pix", "boleto", "card"]), amount: z.coerce.number().positive("Valor deve ser positivo"), description: z.string().min(1, "Obrigatório") }),
    defaults: () => ({ gateway: "mercadopago", method: "pix", amount: 10, description: "" }),
    outputs: () => [
      { id: "charge_created", label: "Cobrança criada", tone: "default" },
      { id: "payment_confirmed", label: "Pagamento confirmado", tone: "success" },
      { id: "error", label: "Erro", tone: "error" },
    ],
    summary: (c) => `${s(c.method).toUpperCase()} · R$ ${Number(c.amount ?? 0).toFixed(2).replace(".", ",")}`,
  },
  {
    kind: "approved_sale", label: "Venda aprovada", group: "Pagamentos",
    description: "Marca venda aprovada no contexto",
    fields: [
      { name: "product", label: "Produto", type: "text" },
      { name: "amount", label: "Valor (R$)", type: "number" },
    ],
    schema: z.object({ product: z.string().min(1, "Obrigatório"), amount: z.coerce.number().min(0) }),
    defaults: () => ({ product: "", amount: 0 }),
    outputs: () => NEXT,
    summary: (c) => `${s(c.product) || "—"}`,
  },
  {
    kind: "pixel", label: "Evento de Pixel", group: "Marketing", integration: "facebook",
    description: "Envia evento Lead/Purchase",
    fields: [
      { name: "event", label: "Evento", type: "select", options: opt(["Lead", "Lead"], ["Purchase", "Purchase"], ["CompleteRegistration", "CompleteRegistration"]) },
      { name: "value", label: "Valor (R$)", type: "number" },
    ],
    schema: z.object({ event: z.enum(["Lead", "Purchase", "CompleteRegistration"]), value: z.coerce.number().min(0).optional() }),
    defaults: () => ({ event: "Lead", value: 0 }),
    outputs: () => SUCCESS_ERR,
    summary: (c) => `Evento ${s(c.event)}`,
  },
];

export const OPS: Record<string, string> = { equal: "=", not_equal: "≠", contains: "contém", greater_than: ">", less_than: "<", is_empty: "vazio" };
const UNITS: Record<string, string> = { seconds: "seg", minutes: "min", hours: "h", days: "dias" };

export const BLOCKS: Record<string, BlockDef> = Object.fromEntries(defs.map((d) => [d.kind, d]));
export const BLOCK_LIST = defs;
export const getBlock = (kind: string): BlockDef | undefined => BLOCKS[kind];

export interface FlowNodeData { kind: string; config: Record<string, unknown>; label?: string; [k: string]: unknown }
export interface GraphNode { id: string; type?: string; position: { x: number; y: number }; data: FlowNodeData }
export interface GraphEdge { id: string; source: string; target: string; sourceHandle?: string | null }

export const graphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string().min(1), type: z.string().optional(),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.object({ kind: z.string(), config: z.record(z.string(), z.unknown()), label: z.string().optional() }),
  })).max(2000),
  edges: z.array(z.object({ id: z.string(), source: z.string(), target: z.string(), sourceHandle: z.string().nullable().optional() })).max(5000),
});