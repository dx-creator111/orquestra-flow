import { useEffect, useState } from "react";
import { MessageCircle, Search, RefreshCw, UserRound, ShieldAlert, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
type Conversation={id:string;contact_id:string|null;channel:string;status:string;created_at:string;last_message_at:string|null};
type Contact={id:string;name:string;phone:string};
type Message={id:string;body:string|null;direction:string;created_at:string;status:string};
export function ChatInbox({orgId}:{orgId:string}){
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [contacts,setContacts]=useState<Contact[]>([]);
  const [messages,setMessages]=useState<Message[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [query,setQuery]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function reload(){
    const [a,b]=await Promise.all([
      supabase.from("conversations").select("id,contact_id,channel,status,created_at,last_message_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(100),
      supabase.from("contacts").select("id,name,phone").eq("organization_id",orgId).limit(500)
    ]);
    if(a.error||b.error){setError(a.error?.message||b.error?.message||"Erro");return;}
    setConversations((a.data??[]) as Conversation[]);
    setContacts((b.data??[]) as Contact[]);
  }
  useEffect(()=>{void reload();},[orgId]);
  useEffect(()=>{
    if(!selected){setMessages([]);return;}
    let cancel=false;
    supabase.from("messages").select("id,body,direction,status,created_at").eq("conversation_id",selected).eq("organization_id",orgId).order("created_at",{ascending:true}).limit(200).then(({data,error})=>{
      if(cancel)return;
      if(error)setError(error.message);else setMessages((data??[]) as Message[]);
    });
    return()=>{cancel=true;};
  },[selected,orgId]);
  const contactById=new Map(contacts.map(c=>[c.id,c]));
  const current=conversations.find(c=>c.id===selected);
  const contact=current?.contact_id?contactById.get(current.contact_id):undefined;
  async function updateStatus(status:string){
    if(!selected)return;setBusy(true);
    const {error}=await supabase.from("conversations").update({status}).eq("id",selected).eq("organization_id",orgId);
    if(error)setError(error.message);else setConversations(prev=>prev.map(c=>c.id===selected?{...c,status}:c));
    setBusy(false);
  }
  const filtered=conversations.filter(c=>{
    const name=c.contact_id?contactById.get(c.contact_id)?.name??"Contato":"Contato";
    return (name+" "+(c.contact_id?contactById.get(c.contact_id)?.phone??"":"")).toLowerCase().includes(query.toLowerCase());
  });
  return <div className="flex h-[calc(100vh-12rem)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-card">
    <aside className="flex w-64 shrink-0 flex-col border-r border-border xl:w-72">
      <div className="border-b border-border p-4"><div className="flex items-center justify-between"><h1 className="font-semibold">Conversas</h1>
        <button className="of-ghost" title="Atualizar" onClick={()=>void reload()}><RefreshCw size={15}/></button></div>
        <div className="mt-3 flex gap-2 rounded-lg border border-border p-2"><Search size={16} className="text-muted-foreground"/><input className="min-w-0 flex-1 bg-transparent text-xs outline-none" placeholder="Buscar contatos..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
      <div className="flex-1 overflow-y-auto">{filtered.length===0?<p className="p-5 text-center text-sm text-muted-foreground">Nenhuma conversa.</p>
        :filtered.map(c=>{const person=c.contact_id?contactById.get(c.contact_id):undefined;return <button key={c.id}
          className={"flex w-full items-center gap-3 border-b border-border p-4 text-left hover:bg-accent "+(selected===c.id?"bg-accent":"")} onClick={()=>setSelected(c.id)}>
          <span className="rounded-full bg-secondary p-3"><UserRound size={17}/></span><span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{person?.name||"Contato"}</span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">{person?.phone||c.channel} · {c.status}</span>
          </span></button>})}</div>
    </aside>
    <section className="flex min-w-0 flex-1 flex-col">
      {current?<><header className="flex items-center justify-between border-b border-border p-4"><div><h2 className="font-semibold">{contact?.name||"Contato"}</h2>
        <p className="text-xs text-muted-foreground">{contact?.phone||""}</p></div>
        <select aria-label="Status da conversa" disabled={busy} className="rounded-lg border border-border bg-background px-3 py-2 text-xs" value={current.status} onChange={e=>void updateStatus(e.target.value)}>
          <option value="open">Aberta</option><option value="waiting">Aguardando</option><option value="resolved">Resolvida</option><option value="closed">Fechada</option>
        </select></header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-canvas p-5">{messages.length===0?<div className="mt-20 text-center text-sm text-muted-foreground">Ainda não há mensagens registradas.</div>
          :messages.map(m=><div key={m.id} className={"flex "+(m.direction==="out"?"justify-end":"justify-start")}>
            <div className={"max-w-[80%] rounded-xl p-3 text-sm "+(m.direction==="out"?"bg-primary text-primary-foreground":"border border-border bg-card")}>
              <p className="whitespace-pre-wrap">{m.body||"[mídia]"}</p><p className="mt-2 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString("pt-BR")}</p>
            </div></div>)}</div>
        <div className="border-t border-border p-4"><div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200"><ShieldAlert size={17}/> Envio desabilitado até conectar a API oficial do WhatsApp.</div></div>
      </>:<div className="flex h-full flex-col items-center justify-center text-muted-foreground"><MessageCircle size={42} className="mb-4"/><h2 className="font-semibold">Selecione uma conversa</h2><p className="mt-2 max-w-xs text-center text-sm">Histórico de mensagens de seus contatos.</p></div>}
      {error&&<p role="alert" className="border-t border-border p-3 text-xs text-destructive">{error}</p>}
    </section>
    <aside className="hidden w-64 shrink-0 border-l border-border p-5 2xl:block">
      <h2 className="mb-5 text-sm font-semibold">Detalhes do contato</h2>
      {contact?<div className="space-y-4 text-sm"><div><p className="text-xs text-muted-foreground">Nome</p><p>{contact.name}</p></div>
        <div><p className="text-xs text-muted-foreground">Telefone</p><p>{contact.phone}</p></div>
        <div><p className="text-xs text-muted-foreground">Canal</p><p>{current?.channel}</p></div></div>
      :<p className="text-xs text-muted-foreground">Nenhum contato selecionado.</p>}
    </aside>
  </div>;
}
