-- ===== Core tenancy =====
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  current_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = _org AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_org_admin(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = _org AND user_id = auth.uid() AND role IN ('owner','admin'))
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations, public.memberships, public.profiles TO authenticated;
GRANT ALL ON public.organizations, public.memberships, public.profiles TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_select ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY org_update ON public.organizations FOR UPDATE TO authenticated USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));
CREATE POLICY mem_select ON public.memberships FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY mem_admin_ins ON public.memberships FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY mem_admin_upd ON public.memberships FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY mem_admin_del ON public.memberships FOR DELETE TO authenticated USING (public.is_org_admin(organization_id) AND role <> 'owner');
CREATE POLICY prof_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.memberships m1 JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
  WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id));
CREATE POLICY prof_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND (current_organization_id IS NULL OR public.is_org_member(current_organization_id)));

-- ===== Helper to create standard org-scoped table policies =====
CREATE OR REPLACE FUNCTION public._org_policies(_t text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', _t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', _t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_org_member(organization_id))', _t||'_sel', _t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id))', _t||'_ins', _t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id))', _t||'_upd', _t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_org_member(organization_id))', _t||'_del', _t);
  EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', _t||'_touch', _t);
END $$;

-- ===== Flows =====
CREATE TABLE public.flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  is_example boolean NOT NULL DEFAULT false,
  draft_nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  draft_edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  node_count int NOT NULL DEFAULT 0,
  published_version_id uuid,
  has_unpublished_changes boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('flows');

CREATE TABLE public.flow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  version int NOT NULL,
  nodes jsonb NOT NULL,
  edges jsonb NOT NULL,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flow_id, version)
);
-- immutable: select + insert only
GRANT SELECT, INSERT ON public.flow_versions TO authenticated;
GRANT ALL ON public.flow_versions TO service_role;
ALTER TABLE public.flow_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY fv_sel ON public.flow_versions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY fv_ins ON public.flow_versions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.flow_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  node_key text NOT NULL,
  kind text NOT NULL,
  position jsonb NOT NULL DEFAULT '{}'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('flow_nodes');
CREATE TABLE public.flow_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  edge_key text NOT NULL,
  source text NOT NULL,
  target text NOT NULL,
  source_handle text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('flow_edges');

CREATE TABLE public.flow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.flow_versions(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test','live')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','paused','completed','failed')),
  current_node_id text,
  waiting jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  graph jsonb NOT NULL DEFAULT '{}'::jsonb,
  step_count int NOT NULL DEFAULT 0,
  idempotency_key text,
  error text,
  lock_token uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);
SELECT public._org_policies('flow_executions');
CREATE TABLE public.execution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  execution_id uuid NOT NULL REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  seq int NOT NULL,
  node_id text NOT NULL,
  node_kind text NOT NULL,
  status text NOT NULL,
  output_handle text,
  message text,
  error text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('execution_steps');
CREATE INDEX ON public.execution_steps (execution_id, seq);
CREATE INDEX ON public.flow_executions (flow_id, created_at DESC);

-- ===== Contacts / CRM =====
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, phone)
);
SELECT public._org_policies('contacts');
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'violet',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
SELECT public._org_policies('tags');
CREATE TABLE public.contact_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, tag_id)
);
SELECT public._org_policies('contact_tags');
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  last_message_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('conversations');
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  body text,
  media_url text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('messages');
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'lovable',
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  system_prompt text NOT NULL DEFAULT '',
  tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('agents');
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'not_connected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  has_secret boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('integrations');
-- secrets: server only, never granted to authenticated
CREATE TABLE public.integration_secrets (
  integration_id uuid PRIMARY KEY REFERENCES public.integrations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_secrets TO service_role;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('crm_pipelines');
CREATE TABLE public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('crm_stages');
CREATE TABLE public.crm_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.crm_stages(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  value_cents bigint NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('crm_cards');
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  provider text,
  external_id text,
  description text,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('payment_transactions');
CREATE TABLE public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  secret_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('webhook_endpoints');
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  endpoint_id uuid REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb,
  status text NOT NULL DEFAULT 'received',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('webhook_events');
CREATE TABLE public.dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  template text NOT NULL DEFAULT '',
  audience_tag text,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT public._org_policies('dispatches');

DROP FUNCTION public._org_policies(text);

-- ===== Flow RPCs =====
CREATE OR REPLACE FUNCTION public.save_flow_draft(_flow uuid, _nodes jsonb, _edges jsonb)
RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _org uuid; _ts timestamptz;
BEGIN
  SELECT organization_id INTO _org FROM public.flows WHERE id = _flow;
  IF _org IS NULL OR NOT public.is_org_member(_org) THEN RAISE EXCEPTION 'not allowed'; END IF;
  UPDATE public.flows SET draft_nodes = _nodes, draft_edges = _edges,
    node_count = jsonb_array_length(_nodes), has_unpublished_changes = true
    WHERE id = _flow RETURNING updated_at INTO _ts;
  DELETE FROM public.flow_nodes WHERE flow_id = _flow;
  DELETE FROM public.flow_edges WHERE flow_id = _flow;
  INSERT INTO public.flow_nodes (organization_id, flow_id, node_key, kind, position, config)
    SELECT _org, _flow, n->>'id', COALESCE(n->'data'->>'kind','unknown'), COALESCE(n->'position','{}'::jsonb), COALESCE(n->'data'->'config','{}'::jsonb)
    FROM jsonb_array_elements(_nodes) n;
  INSERT INTO public.flow_edges (organization_id, flow_id, edge_key, source, target, source_handle)
    SELECT _org, _flow, e->>'id', e->>'source', e->>'target', e->>'sourceHandle'
    FROM jsonb_array_elements(_edges) e;
  RETURN _ts;
END $$;

CREATE OR REPLACE FUNCTION public.publish_flow(_flow uuid, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _f public.flows; _v int; _id uuid;
BEGIN
  SELECT * INTO _f FROM public.flows WHERE id = _flow FOR UPDATE;
  IF _f.id IS NULL OR NOT public.is_org_member(_f.organization_id) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT COALESCE(max(version),0)+1 INTO _v FROM public.flow_versions WHERE flow_id = _flow;
  INSERT INTO public.flow_versions (organization_id, flow_id, version, nodes, edges, notes)
    VALUES (_f.organization_id, _flow, _v, _f.draft_nodes, _f.draft_edges, _notes) RETURNING id INTO _id;
  UPDATE public.flows SET status = 'published', published_version_id = _id, has_unpublished_changes = false WHERE id = _flow;
  RETURN _id;
END $$;

-- ===== Signup bootstrap: profile + org + membership + example flow =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _flow uuid; _nodes jsonb; _edges jsonb;
BEGIN
  INSERT INTO public.organizations (name, created_by) VALUES ('Minha organização', NEW.id) RETURNING id INTO _org;
  INSERT INTO public.memberships (organization_id, user_id, role, created_by) VALUES (_org, NEW.id, 'owner', NEW.id);
  INSERT INTO public.profiles (id, full_name, email, current_organization_id)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.email, _org);
  _nodes := '[
    {"id":"n_start","type":"block","position":{"x":0,"y":160},"data":{"kind":"start","config":{"trigger":"manual","variables":[{"key":"valor","value":"150"}]}}},
    {"id":"n_msg","type":"block","position":{"x":320,"y":160},"data":{"kind":"message","config":{"text":"Olá, {first_name}! Bem-vindo ao Orquestra Flow.","media_url":""}}},
    {"id":"n_cond","type":"block","position":{"x":640,"y":160},"data":{"kind":"condition","config":{"logic":"and","rules":[{"left":"{valor}","operator":"greater_than","right":"100"}]}}},
    {"id":"n_true","type":"block","position":{"x":960,"y":40},"data":{"kind":"message","config":{"text":"Seu valor ({valor}) é maior que 100.","media_url":""}}},
    {"id":"n_false","type":"block","position":{"x":960,"y":300},"data":{"kind":"message","config":{"text":"Seu valor ({valor}) é até 100.","media_url":""}}},
    {"id":"n_end","type":"block","position":{"x":1280,"y":160},"data":{"kind":"end","config":{}}}
  ]'::jsonb;
  _edges := '[
    {"id":"e1","source":"n_start","target":"n_msg","sourceHandle":"next"},
    {"id":"e2","source":"n_msg","target":"n_cond","sourceHandle":"next"},
    {"id":"e3","source":"n_cond","target":"n_true","sourceHandle":"true"},
    {"id":"e4","source":"n_cond","target":"n_false","sourceHandle":"false"},
    {"id":"e5","source":"n_true","target":"n_end","sourceHandle":"next"},
    {"id":"e6","source":"n_false","target":"n_end","sourceHandle":"next"}
  ]'::jsonb;
  INSERT INTO public.flows (organization_id, name, description, is_example, draft_nodes, draft_edges, node_count, created_by)
    VALUES (_org, 'Boas-vindas (Exemplo)', 'Fluxo de demonstração editável', true, _nodes, _edges, 6, NEW.id) RETURNING id INTO _flow;
  INSERT INTO public.flow_nodes (organization_id, flow_id, node_key, kind, position, config, created_by)
    SELECT _org, _flow, n->>'id', n->'data'->>'kind', n->'position', n->'data'->'config', NEW.id FROM jsonb_array_elements(_nodes) n;
  INSERT INTO public.flow_edges (organization_id, flow_id, edge_key, source, target, source_handle, created_by)
    SELECT _org, _flow, e->>'id', e->>'source', e->>'target', e->>'sourceHandle', NEW.id FROM jsonb_array_elements(_edges) e;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- org creation by user: auto-add owner membership
CREATE OR REPLACE FUNCTION public.create_organization(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.organizations (name, created_by) VALUES (_name, auth.uid()) RETURNING id INTO _org;
  INSERT INTO public.memberships (organization_id, user_id, role, created_by) VALUES (_org, auth.uid(), 'owner', auth.uid());
  RETURN _org;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;