/**
 * In-memory session store.
 * v1 holds all state in process memory — no database needed.
 * Session IDs are cryptographic UUIDs to prevent enumeration.
 */

import { randomUUID } from "crypto";

export type RequirementType = "capability" | "constraint" | "format" | "tool_use" | "non_testable";
export type CaseCategory = "task_success" | "guardrail" | "format" | "tool_use";
export type CaseStatus = "draft" | "approved" | "dropped";
export type SessionStage =
  | "input"
  | "extracting"
  | "reviewing_requirements"
  | "generating"
  | "reviewing_cases"
  | "exported";

export interface ExtractedRequirement {
  requirementId: string;
  text: string;
  sourceExcerpt: string;
  type: RequirementType;
  testable: boolean;
  ambiguityFlag: boolean;
  suggestedRewrite: string | null;
  included: boolean;
}

export interface EvalCaseMessage {
  role: "user" | "assistant";
  content: string;
}

export interface EvalCaseGrader {
  type: "llm_judge";
  rubric: string;
  passThreshold: number;
}

export interface EvalCase {
  id: string;
  suite: string;
  description: string;
  category: CaseCategory;
  input: {
    messages: EvalCaseMessage[];
    context: Record<string, unknown>;
  };
  expected: {
    behaviour: string;
    graders: EvalCaseGrader[];
  };
  weight: number;
  tags: string[];
  sourceRequirement: string;
}

export interface GeneratedCase {
  id: string;
  case: EvalCase;
  sourceRequirementId: string;
  status: CaseStatus;
  generatorNotes: string | null;
}

export interface Session {
  id: string;
  specTitle: string;
  specText: string;
  stage: SessionStage;
  requirements: ExtractedRequirement[];
  cases: GeneratedCase[];
  createdAt: string;
}

// TTL: evict sessions older than 24 hours to prevent unbounded memory growth
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map<string, Session>();

// Run cleanup every hour
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of sessions) {
    if (new Date(session.createdAt).getTime() < cutoff) {
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000).unref();

export function createSession(specText: string, specTitle?: string): Session {
  const id = randomUUID();
  const title = specTitle ?? deriveTitle(specText);
  const session: Session = {
    id,
    specTitle: title,
    specText,
    stage: "input",
    requirements: [],
    cases: [],
    createdAt: new Date().toISOString(),
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function updateSession(id: string, patch: Partial<Session>): Session | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  const updated = { ...session, ...patch };
  sessions.set(id, updated);
  return updated;
}

export function getRequirement(session: Session, requirementId: string): ExtractedRequirement | undefined {
  return session.requirements.find((r) => r.requirementId === requirementId);
}

export function updateRequirement(
  session: Session,
  requirementId: string,
  patch: Partial<ExtractedRequirement>
): ExtractedRequirement | undefined {
  const idx = session.requirements.findIndex((r) => r.requirementId === requirementId);
  if (idx === -1) return undefined;
  const updated = { ...session.requirements[idx], ...patch };
  session.requirements[idx] = updated;
  sessions.set(session.id, session);
  return updated;
}

export function getCase(session: Session, caseId: string): GeneratedCase | undefined {
  return session.cases.find((c) => c.id === caseId);
}

export function updateCase(
  session: Session,
  caseId: string,
  patch: Partial<GeneratedCase>
): GeneratedCase | undefined {
  const idx = session.cases.findIndex((c) => c.id === caseId);
  if (idx === -1) return undefined;
  const updated = { ...session.cases[idx], ...patch };
  session.cases[idx] = updated;
  sessions.set(session.id, session);
  return updated;
}

function deriveTitle(specText: string): string {
  const headingMatch = specText.match(/^#+ (.+)/m);
  if (headingMatch) return headingMatch[1].trim().slice(0, 60);
  const firstLine = specText.split("\n").find((l) => l.trim().length > 0);
  return firstLine?.trim().slice(0, 60) ?? "Untitled Spec";
}
