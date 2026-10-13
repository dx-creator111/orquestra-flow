import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Handle, Position,
  useNodesState, useEdgesState, useReactFlow, addEdge,
  type Node, type Edge, type Connection, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Check, ChevronRight, Clock3, Download, History, Play, Plus, Redo2,
  Save, Search, Trash2, Undo2, Upload, Workflow, X, AlertCircle, Send, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BLOCK_LIST, GROUPS, getBlock, graphSchema, type FlowNodeData, type GraphNode, type GraphEdge } from "@/lib/flow/blocks";
import { validateGraph, type Issue } from "@/lib/flow/validate";
import { executeFlowServer } from "@/lib/flow/server-functions";

type CanvasNode = Node<FlowNodeData>;
type Snapshot={nodes:CanvasNode[];edges:Edge[]};
type TestResult=Awaited<ReturnType<typeof executeFlowServer>>;
const nodeSize=25;
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
const cls="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const id=()=>crypto.randomUUID();
const readString=(v:unknown)=>String(v??"");

function FlowNodeComponent({data,selected}:NodeProps<CanvasNode>){
  const def=getBlock(data.kind);
  const ports=def?.outputs(data.config??{})??[];
  return <div className={"w-64 rounded-xl border bg-card shadow-xl transition-all "+(selected?"border-primary shadow-primary/15":"border-border hover:border-primary/50")}>
    {!def?.isTrigger&&<Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-background !bg-primary"/>}
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <div className="rounded-lg bg-primary/15 p-2 text-primary"><Workflow size={18}/></div>
      <div className="min-w-0"><div className="truncate text-sm font-bold">{data.label||def?.label||data.kind}</div>
        <div className="text-[10px] text-muted-foreground">{def?.group||"Bloco"}</div></div>
    </div>
    <div className="min-h-12 break-words px-4 py-3 text-xs text-muted-foreground">{def?.summary(data.config??{})||"Configurar bloco"}</div>
    {ports.map((port,index)=><div key={port.id} className="relative flex h-7 items-center justify-end gap-2 pr-5 text-[10px] text-muted-foreground">
      <span>{port.label}</span>
      <Handle type="source" position={Position.Right} id={port.id}
        style={{top:"50%",right:-6}} className="!h-3 !w-3 !border-2 !border-background !bg-primary"/>
    </div>)}
  </div>;
}
const nodeTypes={flowNode:FlowNodeComponent};

function FieldEditor({field,value,onChange}:{field:typeof BLOCK_LIST[number]["fields"][number];value:unknown;onChange:(v:unknown)=>void}){
  if(field.type==="switch")return <label className="flex items-center justify-between gap-3 text-sm">{field.label}
    <input type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)}/></label>;
  if(field.type==="select")return <label className="block space-y-2 text-xs text-muted-foreground">{field.label}
    <select className={cls+" w-full text-foreground"} value={readString(value)} onChange={e=>onChange(e.target.value)}>
      {(field.options??[]).map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select></label>;
  if(field.type==="options"){
    const items=Array.isArray(value)?value.map(readString):[];
    return <div className="space-y-2"><p className="text-xs text-muted-foreground">{field.label}</p>
      {items.map((item,i)=><div key={i} className="flex gap-2"><input className={cls+" min-w-0 flex-1"} value={item} onChange={e=>onChange(items.map((v,j)=>i===j?e.target.value:v))}/>
        <button className="of-ghost" onClick={()=>onChange(items.filter((_,j)=>j!==i))}><Trash2 size={15}/></button></div>)}
      <button className="text-xs text-primary" onClick={()=>onChange([...items,"Nova opção"])}>+ Adicionar opção</button>
    </div>;
  }
  if(field.type==="keyvalue"||field.type==="rules"){
    const items=Array.isArray(value)?value as Record<string,string>[]:[];
    const names=field.type==="rules"?["left","operator","right"]:["key","value"];
    return <div className="space-y-2"><p className="text-xs text-muted-foreground">{field.label}</p>
      {items.map((item,i)=><div key={i} className="flex gap-1">
        {names.map(k=>k==="operator"?<select key={k} className={cls+" min-w-0 w-20 text-xs"} value={item[k]??"equal"}
          onChange={e=>onChange(items.map((v,j)=>i===j?{...v,[k]:e.target.value}:v))}>
          {["equal","not_equal","contains","greater_than","less_than","is_empty"].map(v=><option key={v} value={v}>{v}</option>)}
          </select>:<input key={k} className={cls+" min-w-0 flex-1 text-xs"} placeholder={k} value={item[k]??""}
          onChange={e=>onChange(items.map((v,j)=>i===j?{...v,[k]:e.target.value}:v))}/>)}
        <button className="text-destructive" title="Excluir linha" onClick={()=>onChange(items.filter((_,j)=>j!==i))}><X size={15}/></button></div>)}
      <button className="text-xs text-primary" onClick={()=>onChange([...items,field.type==="rules"?{left:"",operator:"equal",right:""}:{key:"",value:""}])}>+ Adicionar linha</button>
    </div>;
  }
  return <label className="block space-y-2 text-xs text-muted-foreground">{field.label}
    {field.type==="textarea"||field.type==="json"?
      <textarea rows={field.type==="json"?6:4} className={cls+" w-full resize-y font-mono text-foreground"} placeholder={field.placeholder}
        value={readString(value)} onChange={e=>onChange(e.target.value)}/>
      :<input className={cls+" w-full text-foreground"} type={field.type==="number"?"number":"text"}
        value={readString(value)} placeholder={field.placeholder}
        onChange={e=>onChange(field.type==="number"?Number(e.target.value):e.target.value)}/>}
    {field.help&&<span className="block leading-relaxed">{field.help}</span>}
  </label>;
}

function Canvas({flowId,orgId,session}:{flowId:string;orgId:string;session:Session}){
  const rf=useReactFlow<CanvasNode,Edge>();
  const [flowName,setFlowName]=useState("Carregando...");
  const [nodes,setNodes,onNodesChange]=useNodesState<CanvasNode>([]);
  const [edges,setEdges,onEdgesChange]=useEdgesState<Edge>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [saved,setSaved]=useState("Carregando");
  const [issues,setIssues]=useState<Issue[]>([]);
  const [tab,setTab]=useState<"properties"|"history">("properties");
  const [versions,setVersions]=useState<{id:string;version:number;created_at:string}[]>([]);
  const [testOpen,setTestOpen]=useState(false);
  const [testName,setTestName]=useState("Maria Silva"),[testPhone,setTestPhone]=useState("+5511999999999");
  const [testMessage,setTestMessage]=useState("Olá"),[testReply,setTestReply]=useState("");
  const [testResult,setTestResult]=useState<TestResult|null>(null),[testBusy,setTestBusy]=useState(false);
  const [search,setSearch]=useState("");
  const loaded=useRef(false),history=useRef<{past:Snapshot[];future:Snapshot[]}>({past:[],future:[]});
  const selectedNode=nodes.find(n=>n.id===selected);
  const selectedDef=selectedNode?getBlock(selectedNode.data.kind):undefined;

  useEffect(()=>{
    let cancelled=false;loaded.current=false;
    (async()=>{
      const {data,error}=await supabase.from("flows").select("*").eq("id",flowId).eq("organization_id",orgId).single();
      if(cancelled)return;
      if(error||!data){setSaved("Erro: "+(error?.message??"Fluxo inexistente"));return;}
      setFlowName(data.name);
      setNodes(((data.draft_nodes??[]) as unknown as GraphNode[]).map(n=>({...n,type:"flowNode"})));
      setEdges((data.draft_edges??[]) as unknown as Edge[]);
      setTimeout(()=>{loaded.current=true;setSaved("Salvo");},150);
    })();
    return()=>{cancelled=true;loaded.current=false;};
  },[flowId,orgId,setEdges,setNodes]);
  function checkpoint(){
    history.current.past.push({nodes:clone(nodes),edges:clone(edges)});
    if(history.current.past.length>60)history.current.past.shift();
    history.current.future=[];
  }
  function undo(){
    const h=history.current;const old=h.past.pop();if(!old)return;
    h.future.push({nodes:clone(nodes),edges:clone(edges)});
    setNodes(old.nodes);setEdges(old.edges);setSelected(null);
  }
  function redo(){
    const h=history.current;const future=h.future.pop();if(!future)return;
    h.past.push({nodes:clone(nodes),edges:clone(edges)});
    setNodes(future.nodes);setEdges(future.edges);setSelected(null);
  }
  const persist=async(ns:CanvasNode[],es:Edge[])=>{
    setSaved("Salvando...");
    const cleanNodes=ns.map(n=>({id:n.id,type:"flowNode",position:n.position,data:{kind:n.data.kind,config:n.data.config,label:n.data.label}}));
    const cleanEdges=es.map(e=>({id:e.id,source:e.source,target:e.target,sourceHandle:e.sourceHandle??null}));
    const result=await supabase.from("flows").update({draft_nodes:cleanNodes,draft_edges:cleanEdges,
      node_count:ns.length,has_unpublished_changes:true}).eq("id",flowId).eq("organization_id",orgId);
    setSaved(result.error?"Erro: "+result.error.message:"Salvo");
    return !result.error;
  };
  useEffect(()=>{
    if(!loaded.current)return;
    setSaved("Alterações pendentes");
    const timeout=setTimeout(()=>{void persist(nodes,edges);},1100);
    return()=>clearTimeout(timeout);
  },[nodes,edges,flowId,orgId]);
  function addNode(kind:string,position?:{x:number;y:number}){
    const def=getBlock(kind);if(!def)return;
    checkpoint();
    const center=rf.getViewport();
    setNodes(ns=>[...ns,{id:id(),type:"flowNode",
      position:position??{x:(120-center.x)/center.zoom,y:(160-center.y)/center.zoom+ns.length*70},
      data:{kind,config:def.defaults()}}]);
  }
  const onConnect=useCallback((connection:Connection)=>{
    checkpoint();setEdges(es=>addEdge({...connection,id:id(),animated:true},es));
  },[nodes,edges,setEdges]);
  function drop(e:DragEvent<HTMLDivElement>){
    e.preventDefault();const kind=e.dataTransfer.getData("text/orquestra-block");
    if(!kind)return;addNode(kind,rf.screenToFlowPosition({x:e.clientX,y:e.clientY}));
  }
  function updateConfig(field:string,value:unknown){
    if(!selected)return;checkpoint();
    setNodes(ns=>ns.map(n=>n.id===selected?{...n,data:{...n.data,config:{...n.data.config,[field]:value}}}:n));
  }
  function deleteSelected(){
    if(!selected)return;checkpoint();setNodes(ns=>ns.filter(n=>n.id!==selected));
    setEdges(es=>es.filter(e=>e.source!==selected&&e.target!==selected));setSelected(null);
  }
  function duplicateSelected(){
    const n=nodes.find(n=>n.id===selected);if(!n)return;checkpoint();
    const newId=id();setNodes(ns=>[...ns,{...clone(n),id:newId,position:{x:n.position.x+50,y:n.position.y+80},selected:false}]);
    setSelected(newId);
  }
  useEffect(()=>{
    function key(e:globalThis.KeyboardEvent){
      const target=e.target as HTMLElement|null;
      if(target && (["INPUT","TEXTAREA","SELECT"].includes(target.tagName)||target.isContentEditable))return;
      const modifier=e.metaKey||e.ctrlKey;
      if(modifier&&e.key.toLowerCase()==="z"){e.preventDefault();if(e.shiftKey)redo();else undo();}
      if(modifier&&e.key.toLowerCase()==="y"){e.preventDefault();redo();}
      if(modifier&&e.key.toLowerCase()==="s"){e.preventDefault();void persist(nodes,edges);}
      if(e.key==="Delete"||e.key==="Backspace"){deleteSelected();}
    }
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[nodes,edges,selected]);
  function validate(){
    const found=validateGraph(nodes as GraphNode[],edges as GraphEdge[]);
    setIssues(found);
    return !found.some(i=>i.level==="error");
  }
  async function loadVersions(){
    const {data}=await supabase.from("flow_versions").select("id,version,created_at")
      .eq("flow_id",flowId).order("version",{ascending:false}).limit(30);
    setVersions(data??[]);setTab("history");
  }
  async function publish(){
    if(!validate()){window.alert("Corrija os erros de validação antes de publicar.");return;}
    if(!await persist(nodes,edges))return;
    const {data:latest}=await supabase.from("flow_versions").select("version").eq("flow_id",flowId)
      .order("version",{ascending:false}).limit(1);
    const version=(latest?.[0]?.version??0)+1;
    const {data:created,error}=await supabase.from("flow_versions").insert({
      organization_id:orgId,flow_id:flowId,version,
      nodes:nodes.map(n=>({id:n.id,type:"flowNode",position:n.position,data:n.data})),
      edges:edges.map(e=>({id:e.id,source:e.source,target:e.target,sourceHandle:e.sourceHandle??null})),
    }).select("id").single();
    if(error||!created){window.alert(error?.message??"Falha ao publicar");return;}
    const result=await supabase.from("flows").update({status:"published",published_version_id:created.id,has_unpublished_changes:false})
      .eq("id",flowId).eq("organization_id",orgId);
    if(result.error){window.alert(result.error.message);return;}
    setSaved("Versão "+version+" publicada");
    await loadVersions();
  }
  async function restore(versionId:string){
    const {data,error}=await supabase.from("flow_versions").select("nodes,edges").eq("id",versionId).eq("flow_id",flowId).single();
    if(error||!data){window.alert(error?.message??"Não encontrada");return;}
    checkpoint();
    setNodes(((data.nodes??[]) as unknown as GraphNode[]).map(n=>({...n,type:"flowNode"})));
    setEdges((data.edges??[]) as unknown as Edge[]);
    setTab("properties");setSelected(null);
  }
  function exportJson(){
    const json=JSON.stringify({nodes:nodes.map(n=>({id:n.id,type:n.type,position:n.position,data:n.data})),
      edges:edges.map(e=>({id:e.id,source:e.source,target:e.target,sourceHandle:e.sourceHandle??null}))},null,2);
    const object=URL.createObjectURL(new Blob([json],{type:"application/json"}));
    const link=document.createElement("a");link.href=object;link.download="orquestra-flow-"+flowId+".json";link.click();
    setTimeout(()=>URL.revokeObjectURL(object),1000);
  }
  async function importJson(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return;
    try{const graph=graphSchema.parse(JSON.parse(await file.text()));checkpoint();
      setNodes(graph.nodes.map(n=>({...n,type:"flowNode"})));setEdges(graph.edges.map(e=>({...e,id:e.id,sourceHandle:e.sourceHandle??null})));
      setSelected(null);setIssues([]);
    }catch(err){window.alert("JSON inválido: "+(err instanceof Error?err.message:"estrutura inválida"));}
    e.target.value="";
  }
  async function test(resume=false,advanceTime=false){
    if(!resume&&!validate()){window.alert("Corrija a validação antes de testar.");return;}
    if(!resume&&!await persist(nodes,edges))return;
    setTestBusy(true);
    try{
      const result=await executeFlowServer({data:{
        accessToken:session.access_token,flowId,name:testName,phone:testPhone,message:testMessage,
        executionId:resume?testResult?.executionId:undefined,
        response:resume&&!advanceTime?testReply:undefined,advanceTime:resume?advanceTime:undefined,
        idempotencyKey:resume?undefined:id()
      }});
      setTestResult(result);setTestReply("");
    }catch(err){window.alert("Erro no simulador: "+(err instanceof Error?err.message:String(err)));}
    finally{setTestBusy(false);}
  }
  return <div className="flex h-screen flex-col overflow-hidden bg-background">
    <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4">
      <div className="flex min-w-0 items-center gap-3">
        <a className="of-ghost" href="/flows" title="Voltar aos fluxos"><ArrowLeft size={18}/></a>
        <span className="rounded-lg bg-brand p-2"><Workflow size={18}/></span>
        <div className="min-w-0"><h1 className="truncate text-sm font-bold">{flowName}</h1><p className="text-[11px] text-muted-foreground">{saved}</p></div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <button className="of-ghost" onClick={undo} title="Desfazer (Ctrl+Z)"><Undo2 size={17}/></button>
        <button className="of-ghost" onClick={redo} title="Refazer (Ctrl+Shift+Z)"><Redo2 size={17}/></button>
        <button className="of-ghost" onClick={()=>void persist(nodes,edges)} title="Salvar (Ctrl+S)"><Save size={17}/></button>
        <button className="of-ghost hidden sm:flex" onClick={exportJson} title="Exportar JSON"><Download size={17}/></button>
        <label className="of-ghost hidden cursor-pointer sm:flex" title="Importar JSON"><Upload size={17}/><input type="file" accept=".json,application/json" className="hidden" onChange={importJson}/></label>
        <button className="of-ghost hidden sm:flex" onClick={loadVersions}><History size={17}/> Histórico</button>
        <button className="of-ghost" onClick={validate}><Check size={16}/> Validar</button>
        <button className="of-ghost" onClick={()=>setTestOpen(!testOpen)}><Play size={16}/> Testar</button>
        <button className="of-primary" onClick={publish}>Publicar</button>
      </div>
    </header>
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border p-4"><h2 className="font-semibold">Blocos</h2><p className="mt-1 text-xs text-muted-foreground">Arraste para o canvas</p>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2"><Search size={15}/><input className="min-w-0 flex-1 bg-transparent text-xs outline-none" placeholder="Buscar" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {GROUPS.map(group=><div key={group} className="mb-5"><h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</h3>
            {BLOCK_LIST.filter(b=>b.group===group&&b.label.toLowerCase().includes(search.toLowerCase())).map(b=>
              <button key={b.kind} draggable
                onDragStart={e=>{e.dataTransfer.setData("text/orquestra-block",b.kind);e.dataTransfer.effectAllowed="move";}}
                onClick={()=>addNode(b.kind)}
                className="mb-1 flex w-full cursor-grab items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left text-xs hover:border-border hover:bg-accent">
                <Plus size={14} className="text-primary"/>{b.label}</button>)}</div>)}
        </div>
      </aside>
      <div className="relative min-w-0 flex-1" onDrop={drop} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";}}>
        <ReactFlow<CanvasNode,Edge> nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          onNodeDragStart={()=>checkpoint()}
          onNodeClick={(_event,node)=>{setSelected(node.id);setTab("properties");}}
          onPaneClick={()=>setSelected(null)}
          fitView deleteKeyCode={null} connectionLineStyle={{stroke:"#9588ff",strokeWidth:2}}>
          <Background gap={24} size={1}/><Controls/><MiniMap zoomable pannable nodeColor="#6657a8"/>
        </ReactFlow>
        {nodes.length===0&&<div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <Workflow size={40} className="mx-auto mb-3 text-muted-foreground"/><p className="font-medium">Canvas vazio</p><p className="mt-2 text-sm text-muted-foreground">Adicione um bloco usando a paleta.</p></div>}
        {issues.length>0&&<div className="absolute bottom-4 left-4 z-10 max-h-44 w-80 overflow-y-auto rounded-lg border border-border bg-card/95 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between"><strong className="text-xs">Validação ({issues.length})</strong><button onClick={()=>setIssues([])}><X size={15}/></button></div>
          {issues.map((issue,i)=><p key={i} className={"mb-1 text-xs "+(issue.level==="error"?"text-red-400":"text-amber-300")}>• {issue.message}</p>)}</div>}
      </div>
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-border bg-card xl:w-80">
        <div className="sticky top-0 z-10 flex border-b border-border bg-card">
          <button className={"flex-1 p-4 text-xs font-medium "+(tab==="properties"?"border-b-2 border-primary":"text-muted-foreground")} onClick={()=>setTab("properties")}>Propriedades</button>
          <button className={"flex-1 p-4 text-xs font-medium "+(tab==="history"?"border-b-2 border-primary":"text-muted-foreground")} onClick={loadVersions}>Versões</button>
        </div>
        {tab==="history"?<div className="p-4">{versions.length?versions.map(v=><div key={v.id} className="mb-3 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">Versão {v.version}</p><p className="mb-2 text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("pt-BR")}</p>
          <button className="text-xs text-primary" onClick={()=>restore(v.id)}>Restaurar como rascunho</button></div>):<p className="text-xs text-muted-foreground">Nenhuma versão publicada.</p>}</div>
        :selectedNode&&selectedDef?<div className="space-y-5 p-5">
          <div><p className="text-[11px] font-medium uppercase tracking-wider text-primary">{selectedDef.group}</p>
            <h3 className="mt-1 text-lg font-bold">{selectedDef.label}</h3><p className="mt-1 text-xs text-muted-foreground">{selectedDef.description}</p></div>
          {selectedDef.fields.map(f=><FieldEditor key={f.name} field={f} value={selectedNode.data.config[f.name]} onChange={v=>updateConfig(f.name,v)}/>)}
          <div className="flex gap-2 border-t border-border pt-4">
            <button className="of-ghost flex gap-1" onClick={duplicateSelected}><Copy size={15}/> Duplicar</button>
            <button className="of-ghost flex gap-1 text-destructive" onClick={deleteSelected}><Trash2 size={15}/> Excluir</button>
          </div></div>:<div className="p-6 text-center text-sm text-muted-foreground"><Workflow size={32} className="mx-auto mb-3"/>Clique em um bloco para configurar suas propriedades.</div>}
      </aside>
    </div>
    {testOpen&&<div className="fixed inset-0 z-40 flex items-center justify-end bg-black/50">
      <div className="flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="text-lg font-semibold">Testar fluxo</h2><p className="text-xs text-muted-foreground">Simulação segura, sem mensagens externas</p></div><button className="of-ghost" onClick={()=>setTestOpen(false)}><X size={20}/></button></div>
        <div className="space-y-4 overflow-y-auto p-5">
          <label className="block text-xs text-muted-foreground">Nome do contato<input className={cls+" mt-2 w-full"} value={testName} onChange={e=>setTestName(e.target.value)}/></label>
          <label className="block text-xs text-muted-foreground">Telefone<input className={cls+" mt-2 w-full"} value={testPhone} onChange={e=>setTestPhone(e.target.value)}/></label>
          <label className="block text-xs text-muted-foreground">Mensagem inicial<input className={cls+" mt-2 w-full"} value={testMessage} onChange={e=>setTestMessage(e.target.value)}/></label>
          <button className="of-primary flex w-full items-center justify-center gap-2" disabled={testBusy} onClick={()=>test(false)}><Play size={16}/> {testBusy?"Executando...":"Iniciar novo teste"}</button>
          {testResult&&<div className="space-y-4">
            <div className="rounded-lg border border-border p-3"><p className="text-sm font-semibold">Status: {testResult.status}</p>
              {testResult.error&&<p className="mt-1 text-xs text-destructive">{testResult.error}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Execução: {testResult.executionId}</p></div>
            {testResult.status==="paused"&&<div className="space-y-2 rounded-lg border border-primary/30 p-4">
              <p className="text-sm font-medium">Fluxo pausado ({testResult.waiting?.kind})</p>
              {testResult.waiting?.kind!=="time"&&<input className={cls+" w-full"} placeholder="Digite a resposta do contato" value={testReply} onChange={e=>setTestReply(e.target.value)}/>}
              {testResult.waiting?.options?.map(o=><button key={o} className="mr-1 rounded-lg border border-border px-2 py-1 text-xs" onClick={()=>setTestReply(o)}>{o}</button>)}
              <div className="flex gap-2"><button className="of-primary flex-1" disabled={testBusy||testResult.waiting?.kind==="time"} onClick={()=>test(true,false)}><Send size={14}/> Responder</button>
              <button className="of-ghost flex-1" disabled={testBusy} onClick={()=>test(true,true)}><Clock3 size={15}/> Avançar tempo</button></div>
            </div>}
            <div><h3 className="mb-2 text-sm font-semibold">Mensagens produzidas</h3>{testResult.context.messages.map((m,i)=><p className="mb-2 rounded-lg border border-border bg-background p-3 text-sm" key={i}>{m}</p>)}</div>
            <div><h3 className="mb-2 text-sm font-semibold">Passos</h3>{testResult.steps.map(s=><div key={s.seq} className="flex items-center gap-3 border-b border-border py-2 text-xs"><span className="text-muted-foreground">#{s.seq}</span><span className="font-medium">{s.node_kind}</span><span className="ml-auto">{s.status}</span></div>)}</div>
            <div><h3 className="mb-2 text-sm font-semibold">Variáveis</h3><pre className="overflow-auto rounded-lg bg-background p-3 text-xs">{JSON.stringify(testResult.context.variables,null,2)}</pre></div>
          </div>}
        </div>
      </div>
    </div>}
  </div>;
}
export function FlowEditor(props:{flowId:string;orgId:string;session:Session}){
  return <ReactFlowProvider><Canvas {...props}/></ReactFlowProvider>;
}
