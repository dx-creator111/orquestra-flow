import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { Plus, RefreshCw, GripVertical, Columns3, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
type Row={id:string; name:string; [k:string]:unknown};
type Card={id:string;title:string;stage_id:string;pipeline_id:string;value_cents:number;position:number};
export function CRMBoard({orgId}:{orgId:string}){
  const [pipelines,setPipelines]=useState<Row[]>([]);
  const [selected,setSelected]=useState("");
  const [stages,setStages]=useState<(Row&{position:number})[]>([]);
  const [cards,setCards]=useState<Card[]>([]);
  const [pipelineName,setPipelineName]=useState("");
  const [stageName,setStageName]=useState("");
  const [title,setTitle]=useState("");
  const [value,setValue]=useState("0");
  const [stageTarget,setStageTarget]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function loadPipelines(){
    const {data,error}=await supabase.from("crm_pipelines").select("id,name").eq("organization_id",orgId).order("created_at",{ascending:true});
    if(error){setError(error.message);return;}
    setPipelines((data??[]) as Row[]);
    setSelected(current=>current||data?.[0]?.id||"");
  }
  async function loadBoard(){
    if(!selected)return;
    const [a,b]=await Promise.all([
      supabase.from("crm_stages").select("id,name,position").eq("pipeline_id",selected).eq("organization_id",orgId).order("position"),
      supabase.from("crm_cards").select("id,title,value_cents,stage_id,pipeline_id,position").eq("pipeline_id",selected).eq("organization_id",orgId).order("position")
    ]);
    if(a.error||b.error){setError(a.error?.message||b.error?.message||"Erro de leitura");return;}
    setStages((a.data??[]) as (Row&{position:number})[]);
    setCards((b.data??[]) as Card[]);
    if(!stageTarget)setStageTarget(a.data?.[0]?.id??"");
  }
  useEffect(()=>{void loadPipelines();},[orgId]);
  useEffect(()=>{void loadBoard();},[selected]);
  async function addPipeline(e:FormEvent){
    e.preventDefault();if(!pipelineName.trim())return;
    setBusy(true);const {data,error}=await supabase.from("crm_pipelines").insert({organization_id:orgId,name:pipelineName.trim()}).select("id").single();
    setBusy(false);if(error){setError(error.message);return;}
    setPipelineName("");if(data)setSelected(data.id);await loadPipelines();
  }
  async function addStage(e:FormEvent){
    e.preventDefault();if(!stageName.trim()||!selected)return;
    const {error}=await supabase.from("crm_stages").insert({organization_id:orgId,pipeline_id:selected,name:stageName.trim(),position:stages.length});
    if(error){setError(error.message);return;}setStageName("");await loadBoard();
  }
  async function addCard(e:FormEvent){
    e.preventDefault();if(!title.trim()||!selected||!stageTarget)return;
    const cents=Math.round(Number(value.replace(",","."))*100);
    if(!Number.isFinite(cents)||cents<0){setError("Valor inválido");return;}
    const {error}=await supabase.from("crm_cards").insert({organization_id:orgId,pipeline_id:selected,stage_id:stageTarget,title:title.trim(),value_cents:cents});
    if(error){setError(error.message);return;}setTitle("");setValue("0");await loadBoard();
  }
  async function move(e:DragEvent<HTMLDivElement>,stageId:string){
    e.preventDefault();
    const cardId=e.dataTransfer.getData("application/x-orquestra-card");
    const card=cards.find(x=>x.id===cardId);
    if(!card||card.stage_id===stageId)return;
    const {error}=await supabase.from("crm_cards").update({stage_id:stageId})
      .eq("id",cardId).eq("pipeline_id",selected).eq("organization_id",orgId);
    if(error){setError(error.message);return;}
    setCards(prev=>prev.map(c=>c.id===cardId?{...c,stage_id:stageId}:c));
  }
  async function removeCard(cardId:string){
    if(!window.confirm("Excluir este card?"))return;
    const {error}=await supabase.from("crm_cards").delete().eq("id",cardId).eq("organization_id",orgId);
    if(error){setError(error.message);return;}setCards(prev=>prev.filter(c=>c.id!==cardId));
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">CRM · Kanban</h1><p className="mt-1 text-sm text-muted-foreground">Organize oportunidades e mova cards arrastando entre etapas.</p></div>
      <button className="of-ghost" title="Atualizar" onClick={()=>void loadBoard()}><RefreshCw size={18}/></button></div>
    {error&&<div role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}<button className="ml-2 underline" onClick={()=>setError("")}>Fechar</button></div>}
    <div className="of-panel flex flex-wrap items-center gap-3 p-4">
      <select className="of-input max-w-xs" value={selected} onChange={e=>{setSelected(e.target.value);setStageTarget("");}}>
        {pipelines.length===0&&<option value="">Nenhum pipeline</option>}
        {pipelines.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <form onSubmit={addPipeline} className="flex min-w-56 flex-1 gap-2">
        <input className="of-input" required placeholder="Novo pipeline" value={pipelineName} onChange={e=>setPipelineName(e.target.value)}/>
        <button className="of-primary" disabled={busy}><Plus size={16}/></button>
      </form>
    </div>
    {!selected?<div className="of-panel p-10 text-center text-muted-foreground">Crie um pipeline para começar.</div>:<>
      <div className="grid gap-4 xl:grid-cols-2">
        <form className="of-panel flex gap-2 p-4" onSubmit={addStage}><input className="of-input" required placeholder="Nova etapa: ex. Em negociação" value={stageName} onChange={e=>setStageName(e.target.value)}/><button className="of-primary"><Columns3 size={16}/> Etapa</button></form>
        <form className="of-panel flex flex-wrap gap-2 p-4" onSubmit={addCard}>
          <input className="of-input min-w-36 flex-1" required placeholder="Nome do card" value={title} onChange={e=>setTitle(e.target.value)}/>
          <input className="of-input w-24" type="number" min="0" step="0.01" aria-label="Valor em reais" value={value} onChange={e=>setValue(e.target.value)}/>
          <select className="of-input w-44" required value={stageTarget} onChange={e=>setStageTarget(e.target.value)}>
            <option value="">Escolha a etapa</option>{stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select><button className="of-primary" disabled={!stages.length}><Plus size={16}/> Card</button>
        </form>
      </div>
      <div className="flex min-h-80 gap-4 overflow-x-auto pb-4">
        {stages.map(stage=><div key={stage.id} className="of-panel w-72 shrink-0 p-3"
          onDragOver={e=>e.preventDefault()} onDrop={e=>void move(e,stage.id)}>
          <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-semibold">{stage.name}</h2><span className="rounded-full bg-secondary px-2 py-1 text-xs">{cards.filter(c=>c.stage_id===stage.id).length}</span></div>
          <div className="space-y-2">{cards.filter(c=>c.stage_id===stage.id).map(card=>
            <div key={card.id} draggable onDragStart={e=>e.dataTransfer.setData("application/x-orquestra-card",card.id)}
              className="cursor-grab rounded-lg border border-border bg-background p-3 shadow-sm">
              <div className="flex items-start gap-2"><GripVertical size={14} className="mt-1 shrink-0 text-muted-foreground"/><p className="flex-1 text-sm font-medium">{card.title}</p>
                <button title="Excluir card" onClick={()=>void removeCard(card.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14}/></button></div>
              <p className="mt-3 text-xs font-semibold text-primary">{(card.value_cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p>
            </div>)}
            {cards.every(c=>c.stage_id!==stage.id)&&<p className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">Arraste cards para esta etapa</p>}
          </div>
        </div>)}
      </div>
    </>}
  </div>;
}
