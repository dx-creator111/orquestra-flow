export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          model: string
          name: string
          organization_id: string
          provider: string
          system_prompt: string
          tools: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          model?: string
          name: string
          organization_id: string
          provider?: string
          system_prompt?: string
          tools?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          model?: string
          name?: string
          organization_id?: string
          provider?: string
          system_prompt?: string
          tools?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          tag_id: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id: string
          tag_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          tag_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          created_by: string
          custom_fields: Json
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          custom_fields?: Json
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          custom_fields?: Json
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          channel: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cards: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string
          id: string
          organization_id: string
          pipeline_id: string
          position: number
          stage_id: string
          title: string
          updated_at: string
          value_cents: number
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          organization_id: string
          pipeline_id: string
          position?: number
          stage_id: string
          title: string
          updated_at?: string
          value_cents?: number
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          pipeline_id?: string
          position?: number
          stage_id?: string
          title?: string
          updated_at?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_cards_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cards_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cards_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          pipeline_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          organization_id: string
          pipeline_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          pipeline_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          audience_tag: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          scheduled_at: string | null
          status: string
          template: string
          updated_at: string
        }
        Insert: {
          audience_tag?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name: string
          organization_id: string
          scheduled_at?: string | null
          status?: string
          template?: string
          updated_at?: string
        }
        Update: {
          audience_tag?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          scheduled_at?: string | null
          status?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_steps: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          error: string | null
          execution_id: string
          id: string
          message: string | null
          node_id: string
          node_kind: string
          organization_id: string
          output_handle: string | null
          seq: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          error?: string | null
          execution_id: string
          id?: string
          message?: string | null
          node_id: string
          node_kind: string
          organization_id: string
          output_handle?: string | null
          seq: number
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          error?: string | null
          execution_id?: string
          id?: string
          message?: string | null
          node_id?: string
          node_kind?: string
          organization_id?: string
          output_handle?: string | null
          seq?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "flow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_edges: {
        Row: {
          created_at: string
          created_by: string | null
          edge_key: string
          flow_id: string
          id: string
          organization_id: string
          source: string
          source_handle: string | null
          target: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          edge_key: string
          flow_id: string
          id?: string
          organization_id: string
          source: string
          source_handle?: string | null
          target: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          edge_key?: string
          flow_id?: string
          id?: string
          organization_id?: string
          source?: string
          source_handle?: string | null
          target?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_edges_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_edges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_executions: {
        Row: {
          context: Json
          created_at: string
          created_by: string
          current_node_id: string | null
          error: string | null
          finished_at: string | null
          flow_id: string
          graph: Json
          id: string
          idempotency_key: string | null
          lock_token: string | null
          mode: string
          organization_id: string
          started_at: string
          status: string
          step_count: number
          updated_at: string
          version_id: string | null
          waiting: Json | null
        }
        Insert: {
          context?: Json
          created_at?: string
          created_by?: string
          current_node_id?: string | null
          error?: string | null
          finished_at?: string | null
          flow_id: string
          graph?: Json
          id?: string
          idempotency_key?: string | null
          lock_token?: string | null
          mode?: string
          organization_id: string
          started_at?: string
          status?: string
          step_count?: number
          updated_at?: string
          version_id?: string | null
          waiting?: Json | null
        }
        Update: {
          context?: Json
          created_at?: string
          created_by?: string
          current_node_id?: string | null
          error?: string | null
          finished_at?: string | null
          flow_id?: string
          graph?: Json
          id?: string
          idempotency_key?: string | null
          lock_token?: string | null
          mode?: string
          organization_id?: string
          started_at?: string
          status?: string
          step_count?: number
          updated_at?: string
          version_id?: string | null
          waiting?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_executions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "flow_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_nodes: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          flow_id: string
          id: string
          kind: string
          node_key: string
          organization_id: string
          position: Json
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          flow_id: string
          id?: string
          kind: string
          node_key: string
          organization_id: string
          position?: Json
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          flow_id?: string
          id?: string
          kind?: string
          node_key?: string
          organization_id?: string
          position?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_nodes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_versions: {
        Row: {
          created_at: string
          created_by: string
          edges: Json
          flow_id: string
          id: string
          nodes: Json
          notes: string | null
          organization_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          edges: Json
          flow_id: string
          id?: string
          nodes: Json
          notes?: string | null
          organization_id: string
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          edges?: Json
          flow_id?: string
          id?: string
          nodes?: Json
          notes?: string | null
          organization_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "flow_versions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          draft_edges: Json
          draft_nodes: Json
          has_unpublished_changes: boolean
          id: string
          is_example: boolean
          name: string
          node_count: number
          organization_id: string
          published_version_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          draft_edges?: Json
          draft_nodes?: Json
          has_unpublished_changes?: boolean
          id?: string
          is_example?: boolean
          name: string
          node_count?: number
          organization_id: string
          published_version_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          draft_edges?: Json
          draft_nodes?: Json
          has_unpublished_changes?: boolean
          id?: string
          is_example?: boolean
          name?: string
          node_count?: number
          organization_id?: string
          published_version_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_secrets: {
        Row: {
          ciphertext: string
          created_at: string
          integration_id: string
          iv: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          ciphertext: string
          created_at?: string
          integration_id: string
          iv: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          ciphertext?: string
          created_at?: string
          integration_id?: string
          iv?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_secrets_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: true
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_secrets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          created_by: string
          has_secret: boolean
          id: string
          kind: string
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string
          has_secret?: boolean
          id?: string
          kind: string
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string
          has_secret?: boolean
          id?: string
          kind?: string
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          created_by: string | null
          direction: string
          id: string
          media_url: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          created_by?: string | null
          direction: string
          id?: string
          media_url?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          media_url?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          contact_id: string | null
          created_at: string
          created_by: string
          currency: string
          description: string | null
          external_id: string | null
          id: string
          organization_id: string
          provider: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          contact_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          external_id?: string | null
          id?: string
          organization_id: string
          provider?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          contact_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          external_id?: string | null
          id?: string
          organization_id?: string
          provider?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_organization_id: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_organization_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_organization_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          secret_hash: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          name: string
          organization_id: string
          secret_hash: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          secret_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          created_by: string | null
          endpoint_id: string | null
          headers: Json
          id: string
          organization_id: string
          payload: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          endpoint_id?: string | null
          headers?: Json
          id?: string
          organization_id: string
          payload?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          endpoint_id?: string | null
          headers?: Json
          id?: string
          organization_id?: string
          payload?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: { Args: { _name: string }; Returns: string }
      is_org_admin: { Args: { _org: string }; Returns: boolean }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      publish_flow: {
        Args: { _flow: string; _notes?: string }
        Returns: string
      }
      save_flow_draft: {
        Args: { _edges: Json; _flow: string; _nodes: Json }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const