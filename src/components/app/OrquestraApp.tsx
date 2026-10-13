import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import {
  Activity, Bot, CreditCard, Database, GitBranch, LayoutDashboard, LogOut,
  Megaphone, MessageCircle, Plus, RadioTower, Settings2, Shield, Users, Workflow,
  Trash2, Copy, Archive, ArrowRight, Search, RefreshCw, PlugZap, CalendarClock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FlowEditor } from "./FlowEditor";
import { CRMBoard } from "./CRMBoard";
import { ChatInbox } from "./ChatInbox";

type RecordRow = Record<string, unknown> & {id: string};
type NavItem = { slug:string; label:string; icon: typeof Workflow };
const nav:NavItem[] = [
  {slug:"dashboard",label:"Visão geral",icon:LayoutDashboard},
  {slug:"chats",label:"Conversas",icon:MessageCircle},
  {slug:"flows",label:"Fluxos",icon:Workflow},
  {slug:"agents",label:"Agentes de IA",icon:Bot},
  {slug:"customers",label:"Clientes",icon:Users},
  {slug:"crms",label:"CRM",icon:GitBranch},
  {slug:"connections",label:"Conexões",icon:PlugZap},
  {slug:"webhooks",label:"Webhooks",icon:RadioTower},
  {slug:"dispatches",label:"Disparos",icon:Megaphone},
  {slug:"facebook",label:"Campanhas",icon:Activity},
  {slug:"billing",label:"Pagamentos",icon:CreditCard},
  {slug:"settings",label:"Configurações",icon:Settings2},
];
const tableFor:Record<string,string> = {
  flows:"flows", customers:"contacts", agents:"agents", crms:"crm_pipelines",
  chats:"conversations", connections:"integrations", webhooks:"webhook_endpoints",
  dispatches:"dispatches", facebook:"integrations", billing:"payment_transactions",
};
const asText=(v:unknown)=>String(v ?? "");
const humanDate=(v:unknown)=>v?new Date(asText(v)).toLocaleString("pt-BR"):"—";

function Login({onSession}:{onSession:(s:Session)=>void}) {
  const [mode,setMode]=useState<"login"|"signup">("login");
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");
  const [name,setName]=useState("");const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  async function submit(e:FormEvent) {
    e.preventDefault();setPending(true);setError("");
    try {
      if (mode==="login") {
        const {data,error}=await supabase.auth.signInWithPassword({email,password});
        if(error)throw error;
        if(data.session)onSession(data.session);
      } else {
        const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
        if(error)throw error;
        if(data.session)onSession(data.session);
        else setError("Cadastro criado. Verifique seu e-mail para confirmar a conta.");
      }
    }catch(e){setError(e instanceof Error?e.message:"Falha na autenticação");}
    finally{setPending(false);}
  }
  return <main className="flex min-h-screen items-center justify-center bg-canvas px-5">
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-9 shadow-2xl">
      <div className="mb-8 flex items-center gap-3"><span className="rounded-xl bg-brand p-3"><Workflow/></span>
        <div><h1 className="text-xl font-bold">Orquestra Flow</h1><p className="text-xs text-muted-foreground">Automação visual independente</p></div></div>
      <h2 className="mb-1 text-2xl font-semibold">{mode==="login"?"Entre na sua conta":"Crie sua conta"}</h2>
      <p className="mb-7 text-sm text-muted-foreground">Seus fluxos e dados ficam protegidos por autenticação.</p>
      <form onSubmit={submit} className="space-y-4">
        {mode==="signup"&&<label className="block text-sm">Nome completo<input className="of-input mt-2" required value={name} onChange={e=>setName(e.target.value)}/></label>}
        <label className="block text-sm">E-mail<input className="of-input mt-2" type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label className="block text-sm">Senha<input className="of-input mt-2" type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></label>
        {error&&<p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button className="of-primary w-full" disabled={pending}>{pending?"Aguarde...":mode==="login"?"Entrar":"Criar conta"}</button>
      </form>
      <button className="mt-5 w-full text-sm text-primary hover:underline" onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}}>
        {mode==="login"?"Não tem conta? Cadastre-se":"Já tem conta? Entrar"}
      </button>
    </div>
  </main>;
}

export function OrquestraApp(){
  const path=useRouterState({select:s=>s.location.pathname});
  const [session,setSession]=useState<Session|null>(null);
  const [ready,setReady]=useState(false);
  const [authError,setAuthError]=useState("");
  const [org,setOrg]=useState<string|null>(null);
  useEffect(()=>{
    let alive=true;
    try {
      supabase.auth.getSession().then(({data,error})=>{
        if(!alive)return;
        if(error)setAuthError(error.message);
        setSession(data.session);setReady(true);
      }).catch(e=>{if(alive){setAuthError(asText(e));setReady(true);}});
      const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{
        if(alive)setSession(s);
      });
      return()=>{alive=false;subscription.unsubscribe();};
    }catch(e){setAuthError(e instanceof Error?e.message:asText(e));setReady(true);return ()=>{alive=false;};}
  },[]);
  useEffect(()=>{
    if(!session){setOrg(null);return ()=>{};}
    let cancelled=false;
    supabase.from("profiles").select("current_organization_id").eq("id",session.user.id).single()
      .then(({data})=>{if(!cancelled)setOrg(data?.current_organization_id??null);});
    return()=>{cancelled=true;};
  },[session?.user.id]);
  if(!ready)return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando Orquestra Flow...</div>;
  if(authError&&!session)return <div className="mx-auto max-w-lg p-10"><h1 className="text-lg font-semibold">Configuração necessária</h1>
    <p className="mt-2 text-sm text-muted-foreground">{authError}</p><p className="mt-2 text-sm">Configure as variáveis Supabase no ambiente de execução.</p></div>;
  if(!session)return <Login onSession={setSession}/>;
  const editorMatch=path.match(/^\/flows\/([0-9a-f-]{36})\/editor\/?$/);
  const executionsMatch=path.match(/^\/flows\/([0-9a-f-]{36})\/executions\/?$/);
  if(editorMatch&&org)return <FlowEditor flowId={editorMatch[1]!} orgId={org} session={session}/>;
  const section=path.split("/")[1]||"dashboard";
  const current=nav.find(n=>n.slug===section)??nav[0]!;
  return <div className="flex min-h-screen bg-background">
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex h-20 items-center gap-3 border-b border-border px-6">
        <span className="rounded-lg bg-brand p-2"><Workflow size={22}/></span>
        <div><div className="font-bold tracking-tight">Orquestra Flow</div><div className="text-[11px] text-muted-foreground">AUTOMAÇÃO & IA</div></div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {nav.map(({slug,label,icon:Icon})=><a key={slug} href={"/"+slug}
          className={"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors "+(section===slug?"bg-primary/15 font-medium text-primary":"text-muted-foreground hover:bg-sidebar-accent hover:text-foreground")}>
          <Icon size={18}/>{label}</a>)}
      </nav>
      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        <div className="truncate font-medium text-foreground">{session.user.email}</div>
        <button className="mt-3 flex items-center gap-2 hover:text-foreground" onClick={()=>supabase.auth.signOut()}><LogOut size={15}/> Sair</button>
      </div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
        <div className="flex flex-wrap items-center gap-3"><current.icon size={20} className="text-primary"/><strong>{current.label}</strong></div>
        <span className="hidden rounded-md border border-border px-3 py-1 text-xs text-muted-foreground sm:block">Workspace pessoal</span>
      </header>
      <div className="flex gap-2 overflow-x-auto border-b border-border p-2 md:hidden">{nav.map(n=><a href={"/"+n.slug} key={n.slug} className="shrink-0 rounded-md bg-card px-3 py-1 text-xs">{n.label}</a>)}</div>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {!org?<div className="of-panel p-6">Preparando organização. Se a conta é nova, verifique se seu cadastro foi confirmado e atualize a página.</div>
        :executionsMatch?<ExecutionHistory flowId={executionsMatch[1]!} orgId={org}/>
        :section==="dashboard"?<Dashboard orgId={org}/>
        :section==="flows"?<Flows orgId={org}/>
        :section==="crms"?<CRMBoard orgId={org}/>
        :section==="chats"?<ChatInbox orgId={org}/>
        :<RecordsSection key={section} orgId={org} section={section}/>}
      </div>
    </main>
  </div>;
}

function useRows(table:string,orgId:string){
  const [rows,setRows]=useState<RecordRow[]>([]);
  const [loading,setLoading]=useState(true);const [error,setError]=useState("");
  async function reload(){
    setLoading(true);setError("");
    try{
      const {data,error}=await supabase.from(table as "flows").select("*").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(100);
      if(error)throw error;
      setRows((data??[]) as RecordRow[]);
    }catch(e){setError(e instanceof Error?e.message:asText(e));}
    finally{setLoading(false);}
  }
  useEffect(()=>{void reload();},[table,orgId]);
  return {rows,loading,error,reload};
}
function Heading({title,desc,children}:{title:string;desc:string;children?:React.ReactNode}){
  return <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
    <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{desc}</p></div>
    {children}
  </div>;
}
function Dashboard({orgId}:{orgId:string}){
  const [counts,setCounts]=useState<Record<string,number>>({});
  useEffect(()=>{let active=true;Promise.all(["flows","contacts","agents","flow_executions"].map(async table=>{
    const r=await supabase.from(table as "flows").select("id",{count:"exact",head:true}).eq("organization_id",orgId);
    return [table,r.count??0] as const;
  })).then(data=>{if(active)setCounts(Object.fromEntries(data));});return()=>{active=false;};},[orgId]);
  return <><Heading title="Painel de controle" desc="Visão geral com dados reais da sua organização."/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{([
      {title:"Fluxos",count:counts.flows,Icon:Workflow},{title:"Clientes",count:counts.contacts,Icon:Users},
      {title:"Agentes",count:counts.agents,Icon:Bot},{title:"Execuções",count:counts.flow_executions,Icon:Activity}
    ] as {title:string;count:number|undefined;Icon:LucideIcon}[]).map(({title,count,Icon})=>
      <div className="of-panel p-6" key={title}><div className="mb-4 flex items-center justify-between text-muted-foreground"><span className="text-sm">{title}</span><Icon size={20}/></div><div className="text-3xl font-bold tabular-nums">{count===undefined?"—":count}</div></div>)}</div>
    <div className="of-panel mt-6 p-8"><div className="flex items-center gap-4"><Workflow size={32} className="text-primary"/><div><h2 className="text-lg font-semibold">Comece com um fluxo visual</h2><p className="text-sm text-muted-foreground">Arraste blocos, conecte saídas e teste antes de publicar.</p></div></div>
      <a className="of-primary mt-5 inline-flex gap-2" href="/flows">Abrir fluxos <ArrowRight size={17}/></a></div>
  </>;
}
function Flows({orgId}:{orgId:string}){
  const {rows,loading,error,reload}=useRows("flows",orgId);
  const [name,setName]=useState("");const [adding,setAdding]=useState(false);const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState("");
  async function addFlow(e:FormEvent){
    e.preventDefault();if(!name.trim())return;setBusy(true);
    const {data,error}=await supabase.from("flows").insert({name:name.trim(),organization_id:orgId,draft_nodes:[],draft_edges:[]}).select("id").single();
    setBusy(false);
    if(error){window.alert(error.message);return;}
    if(data)window.location.href="/flows/"+data.id+"/editor";
  }
  async function change(row:RecordRow,task:"archive"|"duplicate"|"delete"){
    if(task==="delete"&&!window.confirm("Excluir permanentemente o fluxo "+asText(row.name)+"?"))return;
    let result;
    if(task==="archive")result=await supabase.from("flows").update({status:"archived"}).eq("id",row.id).eq("organization_id",orgId);
    else if(task==="delete")result=await supabase.from("flows").delete().eq("id",row.id).eq("organization_id",orgId);
    else result=await supabase.from("flows").insert({organization_id:orgId,name:asText(row.name)+" (cópia)",draft_nodes:row.draft_nodes as Json,draft_edges:row.draft_edges as Json,node_count:Number(row.node_count??0)});
    if(result.error)window.alert(result.error.message);
    await reload();
  }
  return <><Heading title="Seus fluxos" desc="Desenhe, teste e publique suas automações.">
    <button className="of-primary flex items-center gap-2" onClick={()=>setAdding(!adding)}><Plus size={17}/> Novo fluxo</button></Heading>
    {adding&&<form onSubmit={addFlow} className="of-panel mb-5 flex gap-3 p-4"><input className="of-input flex-1" required autoFocus placeholder="Nome do fluxo" value={name} onChange={e=>setName(e.target.value)}/><button disabled={busy} className="of-primary">Criar</button></form>}
    <div className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-card p-3"><Search size={17} className="text-muted-foreground"/><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Buscar fluxos..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
    {error&&<p role="alert" className="mb-3 text-destructive">{error}</p>}
    {loading?<p className="text-muted-foreground">Carregando...</p>:rows.filter(r=>asText(r.name).toLowerCase().includes(search.toLowerCase())).length===0
    ?<div className="of-panel p-12 text-center text-muted-foreground">Nenhum fluxo encontrado. Crie o primeiro para começar.</div>
    :<div className="grid gap-4">{rows.filter(r=>asText(r.name).toLowerCase().includes(search.toLowerCase())).map(row=>
      <div key={row.id} className="of-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div><h2 className="font-semibold">{asText(row.name)}</h2><div className="mt-2 text-xs text-muted-foreground">{asText(row.node_count??0)} blocos · {asText(row.status)} · {humanDate(row.updated_at)}</div></div>
        <div className="flex items-center gap-2">
          <a className="of-primary" href={"/flows/"+row.id+"/editor"}>Editar</a>
          <a className="of-ghost" href={"/flows/"+row.id+"/executions"} title="Execuções"><Activity size={17}/></a>
          <button className="of-ghost" onClick={()=>change(row,"duplicate")} title="Duplicar"><Copy size={17}/></button>
          <button className="of-ghost" onClick={()=>change(row,"archive")} title="Arquivar"><Archive size={17}/></button>
          <button className="of-ghost text-destructive" onClick={()=>change(row,"delete")} title="Excluir"><Trash2 size={17}/></button>
        </div>
      </div>)}</div>}
  </>;
}
function ExecutionHistory({flowId,orgId}:{flowId:string;orgId:string}){
  const [rows,setRows]=useState<RecordRow[]>([]);const [selected,setSelected]=useState<string|null>(null);const [steps,setSteps]=useState<RecordRow[]>([]);
  useEffect(()=>{void supabase.from("flow_executions").select("*").eq("flow_id",flowId).eq("organization_id",orgId)
    .order("created_at",{ascending:false}).limit(100).then(({data})=>setRows((data??[]) as RecordRow[]));},[flowId,orgId]);
  useEffect(()=>{if(!selected){setSteps([]);return;}void supabase.from("execution_steps").select("*").eq("execution_id",selected)
    .order("seq",{ascending:true}).then(({data})=>setSteps((data??[]) as RecordRow[]));},[selected]);
  return <><Heading title="Histórico de execuções" desc="Resultados e etapas registradas no servidor.">
    <a className="of-primary" href={"/flows/"+flowId+"/editor"}>Voltar ao editor</a></Heading>
    <div className="grid gap-4 xl:grid-cols-2"><div className="of-panel divide-y divide-border">{rows.length?rows.map(r=>
      <button key={r.id} className={"block w-full p-4 text-left hover:bg-accent "+(r.id===selected?"bg-accent":"")} onClick={()=>setSelected(r.id)}>
      <span className="font-medium">{asText(r.status)}</span> <span className="text-xs text-muted-foreground">· {asText(r.mode)} · {humanDate(r.created_at)}</span>
      <div className="mt-1 text-xs text-muted-foreground">{asText(r.step_count)} etapas</div></button>):<p className="p-6 text-sm text-muted-foreground">Nenhuma execução registrada.</p>}</div>
    <div className="of-panel p-4"><h2 className="mb-3 font-semibold">Etapas</h2>{selected?steps.map(s=><div key={s.id} className="border-b border-border py-3 text-sm">
      <div><span className="text-muted-foreground">#{asText(s.seq)}</span> {asText(s.node_kind)} · {asText(s.status)}</div>
      {Boolean(s.message)&&<p className="mt-1 text-xs">{asText(s.message)}</p>}{Boolean(s.error)&&<p className="mt-1 text-xs text-destructive">{asText(s.error)}</p>}
      </div>):<p className="text-sm text-muted-foreground">Selecione uma execução.</p>}</div></div>
  </>;
}
function RecordsSection({section,orgId}:{section:string;orgId:string}){
  const table=tableFor[section];const {rows,loading,error,reload}=useRows(table||"flows",orgId);
  const [name,setName]=useState("");const [phone,setPhone]=useState("");const [systemPrompt,setSystemPrompt]=useState("");
  const title=nav.find(n=>n.slug===section)?.label||section;
  const canAdd=["customers","agents","crms"].includes(section);
  async function add(e:FormEvent){
    e.preventDefault();
    const values:Record<string,unknown> = {organization_id:orgId,name};
    if(section==="customers"){values.phone=phone;}
    if(section==="agents"){values.provider="openai";values.model="gpt-5-mini";values.system_prompt=systemPrompt;values.active=false;}
    const {error}=await supabase.from(table as "flows").insert(values as never);
    if(error)window.alert(error.message);else{setName("");setPhone("");setSystemPrompt("");void reload();}
  }
  const pending=["connections","webhooks","dispatches","facebook","billing"].includes(section);
  return <><Heading title={title} desc={pending?"Integrações externas dependem de configuração e autorização.":"Gerencie os dados reais da sua organização."}>
    <button className="of-ghost" onClick={()=>void reload()}><RefreshCw size={16}/></button></Heading>
    {canAdd&&<form onSubmit={add} className="of-panel mb-6 flex flex-wrap items-end gap-3 p-5">
      <label className="flex min-w-48 flex-1 flex-col gap-2 text-xs">Nome<input className="of-input" required value={name} onChange={e=>setName(e.target.value)}/></label>
      {section==="customers"&&<label className="flex min-w-48 flex-1 flex-col gap-2 text-xs">Telefone E.164<input className="of-input" required pattern="\+[1-9][0-9]{7,14}" placeholder="+5511999999999" value={phone} onChange={e=>setPhone(e.target.value)}/></label>}
      {section==="agents"&&<label className="flex w-full flex-col gap-2 text-xs">Instruções do sistema<textarea className="of-input" value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)}/></label>}
      <button className="of-primary flex items-center gap-2"><Plus size={16}/> Adicionar</button>
    </form>}
    {section==="chats"&&<p className="of-panel mb-5 p-4 text-sm text-muted-foreground">A caixa de entrada exibirá conversas reais após configurar uma conexão oficial do WhatsApp.</p>}
    {section==="settings"&&<div className="of-panel space-y-3 p-6"><h2 className="font-medium">Configurações da organização</h2><p className="text-sm text-muted-foreground">ID da organização: {orgId}</p><p className="text-sm text-muted-foreground">As credenciais das integrações devem ficar armazenadas no servidor.</p></div>}
    {pending&&<div className="mb-5 flex items-center gap-3 rounded-lg border border-amber-600/30 bg-amber-600/5 p-4 text-sm"><Shield size={18} className="text-amber-400"/> Nenhuma integração externa será executada sem configuração explícita.</div>}
    {error&&<p className="text-destructive">{error}</p>}
    {section!=="settings"&&(loading?<p className="text-muted-foreground">Carregando...</p>
      :<div className="of-panel overflow-hidden">{rows.length?rows.map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div><p className="font-medium">{asText(r.name??r.phone??r.kind??r.status??r.id)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{asText(r.phone??r.provider??r.channel??r.kind??"")} · {humanDate(r.updated_at??r.created_at)}</p></div>
        {section==="agents"&&<span className="text-xs text-muted-foreground">{r.active?"Ativo":"Inativo"}</span>}
      </div>):<div className="p-12 text-center"><Database size={28} className="mx-auto mb-3 text-muted-foreground"/><p className="font-medium">Nenhum registro</p><p className="mt-2 text-sm text-muted-foreground">Esta área mostrará dados reais. Recursos externos dependem de integração.</p></div>}</div>)}
  </>;
}
