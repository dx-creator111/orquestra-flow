import { useEffect, useState, type FormEvent } from "react";
import { Bot, Check, KeyRound, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
type Agent={id:string;name:string;provider:string;model:string;system_prompt:string;active:boolean};
export function AgentManager({orgId}:{orgId:string}){
  const [agents,setAgents]=useState<Agent[]>([]);
  const [name,setName]=useState("");const [model,setModel]=useState("gpt-5-mini");
  const [prompt,setPrompt]=useState("Você é um agente de atendimento claro e objetivo.");
  const [active,setActive]=useState(false);const [editId,setEditId]=useState<string|null>(null);
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function reload(){
    const {data,error}=await supabase.from("agents").select("id,name,provider,model,system_prompt,active").eq("organization_id",orgId).order("created_at",{ascending:false});
    if(error)setError(error.message);else setAgents((data??[]) as Agent[]);
  }
  useEffect(()=>{void reload();},[orgId]);
  function reset(){setEditId(null);setName("");setModel("gpt-5-mini");setPrompt("Você é um agente de atendimento claro e objetivo.");setActive(false);}
  function edit(row:Agent){setEditId(row.id);setName(row.name);setModel(row.model);setPrompt(row.system_prompt);setActive(row.active);}
  async function save(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");
    const payload={name:name.trim(),provider:"openai",model:model.trim(),system_prompt:prompt,active};
    if(!payload.name||!payload.model){setError("Nome e modelo são obrigatórios");setBusy(false);return;}
    const q=editId
      ?supabase.from("agents").update(payload).eq("id",editId).eq("organization_id",orgId)
      :supabase.from("agents").insert({...payload,organization_id:orgId});
    const {error}=await q;setBusy(false);
    if(error){setError(error.message);return;}
    reset();await reload();
  }
  async function remove(row:Agent){
    if(!window.confirm("Excluir o agente "+row.name+"?"))return;
    const {error}=await supabase.from("agents").delete().eq("id",row.id).eq("organization_id",orgId);
    if(error)setError(error.message);else await reload();
  }
  return <div>
    <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-bold">Agentes de inteligência artificial</h1>
      <p className="mt-1 text-sm text-muted-foreground">Configure instruções e vincule os agentes aos blocos do editor.</p></div>
      <button className="of-ghost" onClick={()=>void reload()} title="Atualizar"><RefreshCw size={16}/></button>
    </div>
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <KeyRound size={19} className="mt-0.5 shrink-0 text-primary"/>
      <div className="text-sm"><strong>IA real via servidor</strong><p className="mt-1 text-xs text-muted-foreground">Configure OPENAI_API_KEY exclusivamente no ambiente do servidor. Nenhuma chave privada deve ser colada no navegador ou no GitHub. O agente não executa chamadas externas até essa configuração existir.</p></div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="of-panel h-fit p-5">
        <h2 className="mb-5 flex items-center gap-2 font-semibold">{editId?<Pencil size={17}/>:<Plus size={17}/>} {editId?"Editar agente":"Criar agente"}</h2>
        <form className="space-y-4" onSubmit={save}>
          <label className="block text-xs text-muted-foreground">Nome<input className="of-input mt-2" required value={name} onChange={e=>setName(e.target.value)} placeholder="Agente Comercial"/></label>
          <label className="block text-xs text-muted-foreground">Provedor<select className="of-input mt-2"><option>OpenAI (chave no servidor)</option></select></label>
          <label className="block text-xs text-muted-foreground">Modelo<input className="of-input mt-2" required value={model} onChange={e=>setModel(e.target.value)}/></label>
          <label className="block text-xs text-muted-foreground">Prompt de sistema<textarea className="of-input mt-2 min-h-44 resize-y" maxLength={8000} value={prompt} onChange={e=>setPrompt(e.target.value)}/></label>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Agente ativo</label>
          {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2"><button disabled={busy} className="of-primary flex-1"><Check size={16}/>{busy?"Salvando...":editId?"Salvar alterações":"Criar agente"}</button>
            {editId&&<button type="button" onClick={reset} className="of-ghost"><X size={16}/></button>}</div>
        </form>
      </div>
      <div className="space-y-3">{agents.length===0?<div className="of-panel p-10 text-center text-muted-foreground"><Bot size={32} className="mx-auto mb-3"/><p>Nenhum agente cadastrado.</p></div>
        :agents.map(agent=><div key={agent.id} className="of-panel p-5">
          <div className="flex items-start gap-3"><span className="rounded-lg bg-primary/10 p-3 text-primary"><Bot size={21}/></span>
            <div className="min-w-0 flex-1"><h3 className="font-semibold">{agent.name}</h3><p className="mt-1 text-xs text-muted-foreground">{agent.provider} · {agent.model}</p></div>
            <span className={"rounded-full px-2 py-1 text-[11px] "+(agent.active?"bg-green-500/15 text-green-300":"bg-muted text-muted-foreground")}>{agent.active?"Ativo":"Inativo"}</span>
          </div>
          <p className="mt-4 line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">{agent.system_prompt||"Sem instruções"}</p>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3"><code className="text-[10px] text-muted-foreground">{agent.id.slice(0,8)}…</code>
            <div className="flex gap-2"><button className="of-ghost" onClick={()=>edit(agent)}><Pencil size={14}/> Editar</button>
              <button className="of-ghost text-destructive" onClick={()=>void remove(agent)}><Trash2 size={14}/></button></div></div>
        </div>)}</div>
    </div>
  </div>;
}
