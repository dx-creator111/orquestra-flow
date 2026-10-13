import { useEffect, useState, type FormEvent } from "react";
import { Activity, CalendarDays, Check, CreditCard, Globe, MessageCircle,
  Plus, RefreshCw, ShieldAlert, Trash2, Webhook, Settings2, Users, PlugZap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
type Dispatch={id:string;name:string;template:string;audience_tag:string|null;scheduled_at:string|null;status:string;created_at:string};
type Payment={id:string;provider:string|null;description:string|null;amount_cents:number;currency:string;status:string;created_at:string};
type Endpoint={id:string;name:string;active:boolean;created_at:string};
type Event={id:string;endpoint_id:string|null;status:string;created_at:string};
type Integration={id:string;kind:string;name:string;status:string;has_secret:boolean};
const date=(v:string|null)=>v?new Date(v).toLocaleString("pt-BR"):"—";
const top=(title:string,desc:string)=><div className="mb-7"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{desc}</p></div>;
const notice=(text:string)=><div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
  <ShieldAlert size={19} className="shrink-0 text-amber-300"/>{text}</div>;

export function DispatchManager({orgId}:{orgId:string}){
  const [items,setItems]=useState<Dispatch[]>([]);
  const [name,setName]=useState("");const [template,setTemplate]=useState("");
  const [audience,setAudience]=useState("");const [schedule,setSchedule]=useState("");
  const [error,setError]=useState("");
  async function reload(){
    const {data,error}=await supabase.from("dispatches").select("id,name,template,audience_tag,scheduled_at,status,created_at").eq("organization_id",orgId).order("created_at",{ascending:false});
    if(error)setError(error.message);else setItems((data??[]) as Dispatch[]);
  }
  useEffect(()=>{void reload();},[orgId]);
  async function save(e:FormEvent){
    e.preventDefault();
    const {error}=await supabase.from("dispatches").insert({
      organization_id:orgId,name:name.trim(),template:template.trim(),
      audience_tag:audience.trim()||null,scheduled_at:schedule?new Date(schedule).toISOString():null,status:"draft"
    });
    if(error){setError(error.message);return;}
    setName("");setTemplate("");setAudience("");setSchedule("");await reload();
  }
  async function remove(id:string){
    if(!window.confirm("Excluir este rascunho de disparo?"))return;
    const {error}=await supabase.from("dispatches").delete().eq("id",id).eq("organization_id",orgId);
    if(error)setError(error.message);else await reload();
  }
  return <div>{top("Disparos em massa","Prepare mensagens e públicos antes de ativar uma conexão oficial.")}
    {notice("Os registros são rascunhos. Nenhum disparo é feito sem conexão do WhatsApp, autorização dos destinatários e serviço de fila configurado.")}
    <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_3fr]"><form onSubmit={save} className="of-panel h-fit space-y-4 p-5">
      <h2 className="font-semibold">Novo rascunho</h2>
      <label className="block text-xs text-muted-foreground">Nome da campanha<input className="of-input mt-2" required value={name} onChange={e=>setName(e.target.value)}/></label>
      <label className="block text-xs text-muted-foreground">Modelo da mensagem<textarea className="of-input mt-2 min-h-32" required value={template} onChange={e=>setTemplate(e.target.value)} placeholder="Olá, {first_name}..."/></label>
      <label className="block text-xs text-muted-foreground">Etiqueta do público<input className="of-input mt-2" value={audience} onChange={e=>setAudience(e.target.value)} placeholder="clientes-vip"/></label>
      <label className="block text-xs text-muted-foreground">Data planejada<input className="of-input mt-2" type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)}/></label>
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      <button className="of-primary w-full"><Plus size={16}/> Salvar rascunho</button>
    </form>
    <div className="space-y-3">{items.length?items.map(d=><div className="of-panel p-5" key={d.id}>
      <div className="flex justify-between gap-3"><div><h2 className="font-semibold">{d.name}</h2><p className="mt-1 text-xs text-muted-foreground">Status: {d.status} · {date(d.scheduled_at)}</p></div>
      <button className="of-ghost text-destructive" onClick={()=>void remove(d.id)}><Trash2 size={15}/></button></div>
      <p className="mt-3 whitespace-pre-line text-sm">{d.template}</p><p className="mt-3 text-xs text-muted-foreground">Público: {d.audience_tag||"Não filtrado"}</p>
    </div>):<div className="of-panel p-12 text-center text-sm text-muted-foreground">Nenhum rascunho.</div>}</div></div>
  </div>;
}
export function BillingPanel({orgId}:{orgId:string}){
  const [items,setItems]=useState<Payment[]>([]);const [error,setError]=useState("");
  useEffect(()=>{void supabase.from("payment_transactions").select("id,provider,description,amount_cents,currency,status,created_at")
    .eq("organization_id",orgId).order("created_at",{ascending:false}).limit(100)
    .then(({data,error})=>{if(error)setError(error.message);else setItems((data??[]) as Payment[]);});},[orgId]);
  const confirmed=items.filter(x=>["confirmed","paid","approved"].includes(x.status));
  return <div>{top("Pagamentos","Transações registradas por integrações reais; não há lançamentos fictícios.")}
    {notice("Cobranças e confirmações só serão processadas depois que um gateway for configurado no servidor, com webhooks validados.")}
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <div className="of-panel p-5"><p className="text-sm text-muted-foreground">Transações listadas</p><p className="mt-3 text-3xl font-bold">{items.length}</p></div>
      <div className="of-panel p-5"><p className="text-sm text-muted-foreground">Confirmadas</p><p className="mt-3 text-3xl font-bold">{confirmed.length}</p></div>
      <div className="of-panel p-5"><p className="text-sm text-muted-foreground">Volume confirmado (BRL)</p><p className="mt-3 text-2xl font-bold">{(confirmed.filter(x=>x.currency==="BRL").reduce((a,x)=>a+x.amount_cents,0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p></div>
    </div>
    {error&&<p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="of-panel mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr><th className="p-4">Descrição</th><th className="p-4">Valor</th><th className="p-4">Status</th><th className="p-4">Criado em</th></tr></thead>
      <tbody>{items.map(p=><tr className="border-b border-border" key={p.id}><td className="p-4">{p.description||p.provider||"Transação"}</td>
        <td className="p-4">{(p.amount_cents/100).toLocaleString("pt-BR",{style:"currency",currency:p.currency||"BRL"})}</td>
        <td className="p-4">{p.status}</td><td className="p-4 text-muted-foreground">{date(p.created_at)}</td></tr>)}</tbody></table>
      {!items.length&&<p className="p-8 text-center text-sm text-muted-foreground">Nenhuma transação registrada.</p>}</div></div>;
}
export function WebhookPanel({orgId}:{orgId:string}){
  const [endpoints,setEndpoints]=useState<Endpoint[]>([]);const [events,setEvents]=useState<Event[]>([]);const [error,setError]=useState("");
  async function reload(){
    const [a,b]=await Promise.all([
      supabase.from("webhook_endpoints").select("id,name,active,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}),
      supabase.from("webhook_events").select("id,endpoint_id,status,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(50)
    ]);
    if(a.error||b.error)setError(a.error?.message||b.error?.message||"Falha");
    setEndpoints((a.data??[]) as Endpoint[]);setEvents((b.data??[]) as Event[]);
  }
  useEffect(()=>{void reload();},[orgId]);
  return <div>{top("Webhooks","Endpoints e eventos recebidos, com visibilidade do processamento.")}
    {notice("O receptor HTTP autenticado ainda precisa ser configurado na hospedagem. Não foi gerada uma URL fictícia nem exposto um segredo de assinatura.")}
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <div className="of-panel p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold"><Webhook size={18}/> Endpoints</h2>
        {endpoints.length?endpoints.map(ep=><div key={ep.id} className="border-t border-border py-3 text-sm">{ep.name}<span className="ml-2 text-xs text-muted-foreground">{ep.active?"Ativo":"Inativo"}</span></div>)
        :<p className="text-sm text-muted-foreground">Nenhum endpoint configurado.</p>}</div>
      <div className="of-panel p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold"><Activity size={18}/> Eventos</h2>
        {events.length?events.map(ev=><div key={ev.id} className="border-t border-border py-3 text-xs">{ev.status} · {date(ev.created_at)}</div>)
        :<p className="text-sm text-muted-foreground">Nenhum evento recebido.</p>}</div>
    </div>{error&&<p role="alert" className="mt-3 text-destructive">{error}</p>}</div>;
}
export function ConnectionPanel({orgId,facebook=false}:{orgId:string;facebook?:boolean}){
  const [connections,setConnections]=useState<Integration[]>([]);const [error,setError]=useState("");
  useEffect(()=>{void supabase.from("integrations").select("id,kind,name,status,has_secret").eq("organization_id",orgId)
    .then(({data,error})=>{if(error)setError(error.message);else setConnections((data??[]) as Integration[]);});},[orgId]);
  const filtered=connections.filter(c=>facebook?c.kind.includes("facebook"):true);
  return <div>{top(facebook?"Campanhas Meta":"Conexões","Integrações e credenciais gerenciadas com controle de acesso.")}
    {notice("Nenhum canal será identificado como conectado sem validação real no provedor. Tokens precisam ser armazenados criptografados no servidor.")}
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {filtered.map(x=><div className="of-panel p-5" key={x.id}><div className="flex gap-3"><PlugZap className="text-primary"/><div><h2 className="font-semibold">{x.name}</h2><p className="mt-1 text-xs text-muted-foreground">{x.kind} · {x.status}</p></div></div></div>)}
      {!filtered.length&&<div className="of-panel p-8 text-sm text-muted-foreground">{facebook?"Nenhuma conta Meta conectada.":"Nenhuma conexão configurada."}</div>}
    </div><div className="of-panel mt-5 p-6"><h2 className="mb-3 font-semibold">{facebook?"Meta Marketing API":"WhatsApp Cloud API"}</h2>
      <p className="text-sm text-muted-foreground">Próxima etapa: credenciar uma conta empresarial, validar a assinatura dos webhooks, configurar permissões e testar mensagens em ambiente controlado.</p></div>
    {error&&<p className="mt-4 text-destructive">{error}</p>}</div>;
}
export function SettingsPanel({orgId}:{orgId:string}){
  const [name,setName]=useState("");const [members,setMembers]=useState<{id:string;user_id:string;role:string}[]>([]);
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  useEffect(()=>{
    void supabase.from("organizations").select("name").eq("id",orgId).single().then(({data})=>setName(data?.name??""));
    void supabase.from("memberships").select("id,user_id,role").eq("organization_id",orgId).then(({data})=>setMembers(data??[]));
  },[orgId]);
  async function save(e:FormEvent){
    e.preventDefault();setBusy(true);
    const {error}=await supabase.from("organizations").update({name:name.trim()}).eq("id",orgId);
    setMessage(error?error.message:"Organização atualizada");setBusy(false);
  }
  return <div>{top("Configurações","Administração e segurança do seu workspace.")}
    <div className="grid gap-5 lg:grid-cols-2"><form onSubmit={save} className="of-panel space-y-4 p-6">
      <h2 className="flex items-center gap-2 font-semibold"><Settings2 size={18}/> Organização</h2>
      <label className="block text-xs text-muted-foreground">Nome da organização<input className="of-input mt-2" required value={name} onChange={e=>setName(e.target.value)}/></label>
      <p className="break-all text-xs text-muted-foreground">ID: {orgId}</p>
      <button className="of-primary" disabled={busy}><Check size={16}/> Salvar</button>{message&&<p className="text-sm text-muted-foreground">{message}</p>}
      </form>
      <div className="of-panel p-6"><h2 className="mb-4 flex items-center gap-2 font-semibold"><Users size={18}/> Membros</h2>
        {members.map(m=><div key={m.id} className="border-t border-border py-3 text-xs">{m.user_id} <span className="ml-2 text-primary">{m.role}</span></div>)}
        {!members.length&&<p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p>}
      </div></div>
    <div className="of-panel mt-5 p-6"><h2 className="mb-2 font-semibold">Variáveis de ambiente</h2>
      <p className="text-sm text-muted-foreground">Configure Supabase e OPENAI_API_KEY no ambiente privado do deploy. O aplicativo não exibe chaves secretas nem as salva no navegador.</p></div>
  </div>;
}
