import { getBlock, type GraphEdge, type GraphNode } from "./blocks";

export interface Issue { level: "error" | "warning"; message: string; nodeId?: string }

const PAUSING = new Set(["wait_response", "menu", "delay", "smart_interval"]);

export function validateGraph(nodes: GraphNode[], edges: GraphEdge[]): Issue[] {
  const issues: Issue[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const triggers = nodes.filter((n) => getBlock(n.data.kind)?.isTrigger);
  if (triggers.length === 0) issues.push({ level: "error", message: "O fluxo precisa de um bloco Início ou Gatilho Webhook." });
  if (triggers.length > 1) issues.push({ level: "warning", message: `Existem ${triggers.length} gatilhos; o teste usa o primeiro.` });

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) {
      issues.push({ level: "error", message: `Aresta ${e.id} aponta para bloco inexistente.` });
      continue;
    }
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e]);
  }

  for (const n of nodes) {
    const def = getBlock(n.data.kind);
    const name = def?.label ?? n.data.kind;
    if (!def) { issues.push({ level: "error", nodeId: n.id, message: `Tipo de bloco desconhecido: ${n.data.kind}` }); continue; }
    const parsed = def.schema.safeParse(n.data.config ?? {});
    if (!parsed.success) {
      for (const iss of parsed.error.issues.slice(0, 3))
        issues.push({ level: "error", nodeId: n.id, message: `${name}: ${iss.message}` });
    }
    if (!def.isTrigger && !incoming.get(n.id)) issues.push({ level: "error", nodeId: n.id, message: `${name} está desconectado (sem entrada).` });
    const outs = def.outputs(n.data.config ?? {});
    const used = new Set((outgoing.get(n.id) ?? []).map((e) => e.sourceHandle ?? "next"));
    for (const o of outs) {
      if (used.has(o.id)) continue;
      const required = def.requiredOutputs?.includes(o.id);
      issues.push({ level: required ? "error" : "warning", nodeId: n.id, message: `${name}: saída “${o.label}” sem conexão.` });
    }
    if (def.integration) issues.push({ level: "warning", nodeId: n.id, message: `${name} requer integração “${def.integration}” configurada para executar.` });
  }

  // Cycle detection: cycles without a pausing block are dangerous (infinite loop)
  const color = new Map<string, number>();
  const stack: string[] = [];
  const reported = new Set<string>();
  const visit = (id: string) => {
    color.set(id, 1); stack.push(id);
    for (const e of outgoing.get(id) ?? []) {
      const c = color.get(e.target) ?? 0;
      if (c === 0) visit(e.target);
      else if (c === 1) {
        const cyc = stack.slice(stack.indexOf(e.target));
        const safe = cyc.some((x) => PAUSING.has(byId.get(x)?.data.kind ?? ""));
        const key = [...cyc].sort().join(",");
        if (!reported.has(key)) {
          reported.add(key);
          issues.push({ level: safe ? "warning" : "error", nodeId: e.target, message: safe ? `Ciclo com ${cyc.length} blocos (contém espera).` : `Ciclo perigoso sem espera entre ${cyc.length} blocos — loop infinito.` });
        }
      }
    }
    color.set(id, 2); stack.pop();
  };
  for (const n of nodes) if (!color.get(n.id)) visit(n.id);
  return issues;
}