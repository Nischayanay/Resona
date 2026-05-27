export type SessionStatus =
  | "uploaded"
  | "queued"
  | "transcribing"
  | "extracting"
  | "normalizing"
  | "prioritizing"
  | "linking_memory"
  | "suggesting_tools"
  | "completed"
  | "failed"
  | "partial_failed";

export type VynoraSession = {
  id: string;
  title: string;
  source_type: string;
  status: SessionStatus;
  summary?: string | null;
  created_at: string;
  updated_at: string;
};

export type Transcript = {
  id: string;
  raw_text: string;
  language?: string | null;
  model_used: string;
  provider: string;
};

export type Person = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  role?: string | null;
  notes?: string | null;
  relationship_context?: string | null;
};

export type ActionItem = {
  id: string;
  title: string;
  description?: string | null;
  owner_name?: string | null;
  due_at?: string | null;
  priority: "low" | "medium" | "high";
  status: string;
};

export type Opportunity = {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
};

export type MemoryFact = {
  id: string;
  fact: string;
  category: string;
};

export type FollowUp = {
  id: string;
  reason: string;
  suggested_message: string;
  suggested_date?: string | null;
  status: string;
};

export type ToolAction = {
  id: string;
  session_id?: string | null;
  tool_name: string;
  action_type: string;
  payload_json: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    attendees?: { name?: string; email?: string }[];
  };
  reason: string;
  status: string;
  confidence: number;
};

export type SessionInsight = {
  id: string;
  insight_type: string;
  title: string;
  description?: string | null;
  priority: "low" | "medium" | "high";
  priority_score: number;
  signal_reason?: string | null;
  confidence: number;
};

export type PrioritySignal = {
  id: string;
  entity_type: string;
  title: string;
  reason: string;
  final_score: number;
  rank: number;
};

export type SessionDetail = {
  session: VynoraSession;
  transcript?: Transcript | null;
  people: Person[];
  action_items: ActionItem[];
  opportunities: Opportunity[];
  memory_facts: MemoryFact[];
  follow_ups: FollowUp[];
  tool_actions: ToolAction[];
  session_insights?: SessionInsight[];
  priority_signals?: PrioritySignal[];
};
