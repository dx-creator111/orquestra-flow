import { describe, expect, it } from "vitest";
import { runGraph, type RunnerInput } from "./runner";
const node = (id: string, kind: string, config: Record<string, unknown> = {}) => ({
  id, position: {x:0,y:0}, data: {kind, config},
});
describe("server flow simulation", () => {
  it("interpolates and completes a linear path", () => {
    const input: RunnerInput = {
      nodes: [node("a","start"),node("b","message",{text:"Olá {first_name}!"}),node("c","end")],
      edges: [{id:"1",source:"a",target:"b"},{id:"2",source:"b",target:"c"}],
      context: {first_name:"Ana"},
    };
    const result=runGraph(input);
    expect(result.status).toBe("completed");
    expect(result.context.messages).toEqual(["Olá Ana!"]);
    expect(result.steps.map(s=>s.node_id)).toEqual(["a","b","c"]);
  });
  it("pauses, accepts reply, then resumes", () => {
    const input: RunnerInput = {
      nodes:[node("a","start"),node("b","wait_response",{variable:"resposta"}),node("c","message",{text:"{resposta}"})],
      edges:[{id:"1",source:"a",target:"b"},{id:"2",source:"b",sourceHandle:"reply",target:"c"}],
    };
    const pending=runGraph(input);
    expect(pending.status).toBe("paused");
    const resumed=runGraph({...input,currentNodeId:pending.currentNodeId,
      context:pending.context,priorSteps:pending.steps,resume:{response:"confirmado"}});
    expect(resumed.status).toBe("completed");
    expect(resumed.context.variables.resposta).toBe("confirmado");
    expect(resumed.context.messages).toContain("confirmado");
  });
  it("never claims external AI execution without an integration",()=>{
    const input: RunnerInput={nodes:[node("a","start"),node("b","ai")],
      edges:[{id:"1",source:"a",target:"b"}]};
    const state=runGraph(input);
    expect(state.status).toBe("paused");
    expect(state.waiting?.kind).toBe("integration");
    expect(state.context.messages).toEqual([]);
  });
});
