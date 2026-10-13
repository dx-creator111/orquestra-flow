import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runGraph, type RunnerContext, type RunnerStep } from "./runner";
import { graphSchema, type GraphNode, type GraphEdge } from "./blocks";

const requestSchema = z.object({
  accessToken: z.string().min(10),
  flowId: z.string().uuid(),
  executionId: z.string().uuid().optional(),
  idempotencyKey: z.string().uuid().optional(),
  name: z.string().max(150).default(""),
  phone: z.string().max(20).default(""),
  message: z.string().max(5000).default(""),
  response: z.string().max(5000).optional(),
  advanceTime: z.boolean().optional(),
});

/** Test-only server executor. Never invokes live external provider APIs. */
export const executeFlowServer = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .handler(async ({data}) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase server environment is not configured");
    const db = createClient(url, key, {
      global: { headers: { Authorization: "Bearer " + data.accessToken } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {data: auth, error: authError} = await db.auth.getUser(data.accessToken);
    if (authError || !auth.user) throw new Error("Não autorizado");
    const {data: flow,error: flowError} = await db.from("flows")
      .select("id,organization_id,draft_nodes,draft_edges").eq("id",data.flowId).single();
    if (flowError || !flow) throw new Error("Fluxo não encontrado ou sem permissão");
    let graph: {nodes:GraphNode[];edges:GraphEdge[]};
    let context: Partial<RunnerContext>;
    let startFrom: string | null | undefined;
    let priorSteps: RunnerStep[] = [];
    let executionId = data.executionId ?? "";
    let oldStepCount = 0;

    if(data.executionId){
      const {data: prior,error}=await db.from("flow_executions")
        .select("*").eq("id",data.executionId).eq("flow_id",flow.id).single();
      if(error || !prior || prior.status!=="paused")
        throw new Error("Execução não está pausada ou não foi encontrada");
      const waiting = prior.waiting as {kind?:string}|null;
      if(waiting?.kind==="time"&&!data.advanceTime)throw new Error("Use Avançar tempo para continuar");
      if(waiting?.kind!=="time"&&data.response===undefined&&!data.advanceTime)
        throw new Error("Digite uma resposta ou avance o tempo");
      graph = graphSchema.parse(prior.graph);
      context = (prior.context ?? {}) as Partial<RunnerContext>;
      startFrom = prior.current_node_id;
      const {data: steps,error: stepsError}=await db.from("execution_steps").select("*")
        .eq("execution_id",prior.id).order("seq",{ascending:true});
      if(stepsError)throw new Error(stepsError.message);
      priorSteps = (steps??[]).map(s=>({
        seq:s.seq,node_id:s.node_id,node_kind:s.node_kind,status:s.status,
        output_handle:s.output_handle,message:s.message,error:s.error
      }));
      oldStepCount = prior.step_count;
    }else{
      graph = graphSchema.parse({
        nodes:flow.draft_nodes,edges:flow.draft_edges
      });
      const clean = data.name.trim();
      context = {
        full_name:clean,first_name:clean.split(/\s+/)[0]??"",
        phone_number:data.phone.trim(),last_message:data.message,
        variables:{},messages:[],tags:[],
      };
    }
    const state=runGraph({...graph,context,currentNodeId:startFrom,
      priorSteps,resume:data.executionId?{response:data.response,advanceTime:data.advanceTime}:undefined});
    if(!executionId){
      const {data:created,error}=await db.from("flow_executions").insert({
        organization_id:flow.organization_id,flow_id:flow.id,mode:"test",
        status:"running",graph,context,idempotency_key:data.idempotencyKey??crypto.randomUUID()
      }).select("id").single();
      if(error||!created)throw new Error(error?.message??"Falha ao criar execução");
      executionId=created.id;
    }
    let updateQuery = db.from("flow_executions").update({
      status:state.status,current_node_id:state.currentNodeId,
      waiting:state.waiting,context:state.context,step_count:state.steps.length,
      error:state.error,finished_at:state.status==="paused"?null:new Date().toISOString()
    }).eq("id",executionId).eq("flow_id",flow.id);
    if(data.executionId) updateQuery=updateQuery.eq("status","paused").eq("step_count",oldStepCount);
    const {data:updated,error:updateError}=await updateQuery.select("id");
    if(updateError||!updated?.length)throw new Error(updateError?.message??"Execução alterada por outra operação. Recarregue.");
    const freshSteps=state.steps.slice(priorSteps.length);
    if(freshSteps.length){
      const {error:logError}=await db.from("execution_steps").insert(freshSteps.map(step=>({
        ...step, organization_id:flow.organization_id,execution_id:executionId,
      })));
      if(logError)throw new Error("Erro ao gravar o histórico: "+logError.message);
    }
    return {executionId,status:state.status,error:state.error,waiting:state.waiting,
      context:state.context,steps:state.steps};
  });
