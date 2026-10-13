import { getBlock, type GraphNode, type GraphEdge } from "./blocks";

export type RunnerStatus = "paused" | "completed" | "failed";
export type RunnerContext = {
  variables: Record<string, string>;
  messages: string[];
  tags: string[];
  first_name: string;
  full_name: string;
  phone_number: string;
  last_message: string;
};
export type RunnerStep = {
  seq: number;
  node_id: string;
  node_kind: string;
  status: string;
  output_handle: string | null;
  message: string | null;
  error: string | null;
};
export type Waiting = { kind: "reply" | "menu" | "time" | "integration"; nodeId: string; variable?: string; options?: string[] | undefined };
export type RunnerState = {
  status: RunnerStatus;
  currentNodeId: string | null;
  waiting: Waiting | null;
  context: RunnerContext;
  steps: RunnerStep[];
  error: string | null;
};
export interface RunnerInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  context?: Partial<RunnerContext>;
  currentNodeId?: string | null | undefined;
  priorSteps?: RunnerStep[];
  resume?: { response?: string | undefined; advanceTime?: boolean | undefined; externalResult?: string | undefined; externalError?: string | undefined } | undefined;
  maxSteps?: number;
}

const value = (v: unknown) => (v === null || v === undefined ? "" : String(v));
export function interpolate(template: unknown, ctx: RunnerContext): string {
  const vars: Record<string, string> = {
    ...ctx.variables, first_name: ctx.first_name, full_name: ctx.full_name,
    phone_number: ctx.phone_number, last_message: ctx.last_message,
  };
  return value(template).replace(/\{([a-zA-Z_][\w.]*)\}/g, (_m, key: string) => vars[key] ?? "");
}
function evaluateRule(rule: { left: string; operator: string; right: string }, ctx: RunnerContext): boolean {
  const left = interpolate(rule.left, ctx);
  const right = interpolate(rule.right, ctx);
  switch (rule.operator) {
    case "equal": return left === right;
    case "not_equal": return left !== right;
    case "contains": return left.toLowerCase().includes(right.toLowerCase());
    case "greater_than": return Number(left.replace(",", ".")) > Number(right.replace(",", "."));
    case "less_than": return Number(left.replace(",", ".")) < Number(right.replace(",", "."));
    case "is_empty": return !left.trim();
    default: return false;
  }
}
export function runGraph(input: RunnerInput): RunnerState {
  const ctx: RunnerContext = {
    variables: { ...(input.context?.variables ?? {}) },
    messages: [...(input.context?.messages ?? [])],
    tags: [...(input.context?.tags ?? [])],
    first_name: input.context?.first_name ?? "",
    full_name: input.context?.full_name ?? "",
    phone_number: input.context?.phone_number ?? "",
    last_message: input.context?.last_message ?? "",
  };
  const steps: RunnerStep[] = [...(input.priorSteps ?? [])];
  const nodes = new Map(input.nodes.map(n => [n.id, n]));
  const outgoing = (id: string, port: string) => input.edges.find(e =>
    e.source === id && (e.sourceHandle ?? "next") === port
  )?.target ?? null;
  let cursor = input.currentNodeId ?? input.nodes.find(n => getBlock(n.data.kind)?.isTrigger)?.id ?? null;
  let resumed = !!input.resume;
  const maxSteps = Math.max(1, Math.min(100, input.maxSteps ?? 100));
  let status: RunnerStatus = "completed";
  let waiting: Waiting | null = null;
  let error: string | null = null;
  for (let n = 0; n < maxSteps && cursor; n++) {
    const node = nodes.get(cursor);
    if (!node) { status = "failed"; error = "Bloco inexistente: " + cursor; break; }
    const config = node.data.config ?? {};
    const kind = node.data.kind;
    let port = "next";
    let message: string | null = null;
    let stepStatus = "completed";
    let stepError: string | null = null;
    let pause: Waiting | null = null;
    switch (kind) {
      case "start":
      case "webhook_trigger": {
        const pairs = Array.isArray(config.variables) ? config.variables as {key:string;value:string}[] : [];
        pairs.forEach(pair => { if (pair.key) ctx.variables[pair.key] = interpolate(pair.value, ctx); });
        break;
      }
      case "message":
      case "notification": {
        message = interpolate(config.text ?? config.message ?? "", ctx);
        ctx.messages.push(message);
        break;
      }
      case "condition": {
        const rules = Array.isArray(config.rules) ? config.rules as {left:string;operator:string;right:string}[] : [];
        const matches = rules.map(rule => evaluateRule(rule, ctx));
        port = (config.logic === "or" ? matches.some(Boolean) : matches.every(Boolean)) ? "true" : "false";
        break;
      }
      case "set_variable": {
        const pairs = Array.isArray(config.assignments) ? config.assignments as {key:string;value:string}[] : [];
        pairs.forEach(pair => { if (pair.key) ctx.variables[pair.key] = interpolate(pair.value, ctx); });
        break;
      }
      case "tags": {
        const items = value(config.tags).split(",").map(t => t.trim()).filter(Boolean);
        ctx.tags = config.action === "remove" ? ctx.tags.filter(t => !items.includes(t)) : [...new Set([...ctx.tags, ...items])];
        break;
      }
      case "approved_sale": {
        ctx.variables.approved_sale_product = value(config.product);
        ctx.variables.approved_sale_amount = value(config.amount);
        break;
      }
      case "wait_response":
      case "menu": {
        if (resumed) {
          resumed = false;
          const response = value(input.resume?.response);
          if (input.resume?.advanceTime) port = "timeout";
          else if (kind === "menu") {
            const options = (Array.isArray(config.options) ? config.options : []).map(value);
            const index = options.findIndex(x => x.toLowerCase() === response.toLowerCase());
            port = index >= 0 ? "option_" + index : "other";
          } else {
            port = "reply";
          }
          if (typeof config.variable === "string" && port !== "timeout") ctx.variables[config.variable] = response;
          ctx.last_message = response;
        } else {
          stepStatus = "paused";
          pause = { kind: kind === "menu" ? "menu" : "reply", nodeId: node.id, variable: value(config.variable),
            options: kind === "menu" && Array.isArray(config.options) ? config.options.map(value) : undefined };
        }
        break;
      }
      case "delay":
      case "smart_interval": {
        if (resumed && input.resume?.advanceTime) resumed = false;
        else { stepStatus = "paused"; pause = {kind:"time", nodeId:node.id}; }
        break;
      }
      case "end":
        cursor = null;
        break;
      case "ai":
      case "ai_agent": {
        if(resumed && input.resume?.externalResult !== undefined){
          resumed=false;
          ctx.variables[value(config.output_variable)||"ai_response"] = input.resume.externalResult;
          port="success";
        } else if(resumed && input.resume?.externalError){
          resumed=false;port="error";
          ctx.variables.ai_error=input.resume.externalError;
          if(!outgoing(node.id,"error")) {
            stepStatus="failed";stepError=input.resume.externalError;
          }
        } else {
          stepStatus="paused";pause={kind:"integration",nodeId:node.id};
        }
        break;
      }
      default:
        stepStatus = "failed";
        stepError = "Bloco " + kind + " exige integração/configuração no servidor; nenhuma ação externa foi simulada.";
    }
    const step: RunnerStep = {
      seq: steps.length + 1, node_id: node.id, node_kind: kind,
      status: stepStatus, output_handle: stepStatus === "completed" ? port : null,
      message, error: stepError,
    };
    steps.push(step);
    if (stepStatus === "paused") { status = "paused"; waiting = pause; break; }
    if (stepStatus === "failed") { status = "failed"; error = stepError; break; }
    cursor = kind === "end" ? null : outgoing(node.id, port);
  }
  if (status === "completed" && cursor && steps.length >= maxSteps) {
    status = "failed"; error = "Limite de 100 etapas excedido; possível ciclo infinito.";
  }
  return { status, waiting, currentNodeId: status === "paused" ? waiting?.nodeId ?? null : null,
    context: ctx, steps, error };
}
