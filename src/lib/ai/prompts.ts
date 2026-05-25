export const EXTRACTION_PROMPT_VERSION = "resona-extraction-v2-six-engine";

export function buildExtractionPrompt(transcript: string, currentIsoDate: string) {
  return `
You are Vynora's conversation intelligence engine.

Return strict JSON only. Do not wrap it in markdown.

Current date: ${currentIsoDate}

Extract durable intelligence from this transcript:
- concise session summary
- people and relationship context
- recurring topics
- explicit action items
- opportunities
- risks
- follow-up suggestions
- unresolved loops
- emotionally important signals
- key moments
- memory facts
- Google Calendar tool suggestions only when the transcript contains clear meeting or appointment intent with a date/time and purpose

Rules:
- AI never executes tools. It only suggests tool actions.
- Every google_calendar suggestion must set requires_approval to true.
- Calendar tool suggestions are only for real meetings, appointments, calls, interviews, demos, syncs, follow-ups, or scheduled discussions with another person/team/company.
- Do not create calendar tool suggestions for personal routines, meals, meditation, sleep, study blocks, or generic reminders unless the transcript explicitly says it is a meeting/appointment with another party.
- If a date is ambiguous, include the original phrase in descriptions but avoid inventing a calendar start_time.
- Use confidence values between 0 and 1.
- Prefer empty arrays over nulls.

JSON shape:
{
  "summary": "string",
  "people": [{ "name": "string", "email": "optional email", "company": "optional", "role": "optional", "relationship_context": "optional", "confidence": 0.8 }],
  "topics": [{ "name": "string", "summary": "optional", "related_people": ["optional"], "importance": "low|medium|high", "confidence": 0.8 }],
  "action_items": [{ "title": "string", "description": "optional", "owner": "optional", "due_date": "optional ISO or original phrase", "related_person": "optional", "priority": "low|medium|high", "confidence": 0.8 }],
  "opportunities": [{ "type": "internship|startup|collaboration|intro|funding|learning|hiring|research|other", "title": "string", "description": "string", "related_people": ["optional"], "priority": "low|medium|high", "confidence": 0.8 }],
  "risks": [{ "title": "string", "description": "string", "severity": "low|medium|high", "related_people": ["optional"], "confidence": 0.8 }],
  "follow_ups": [{ "person_name": "optional", "reason": "string", "suggested_message": "string", "suggested_date": "optional ISO or original phrase", "confidence": 0.8 }],
  "unresolved_loops": [{ "title": "string", "description": "string", "owner": "optional", "related_person": "optional", "urgency": "low|medium|high", "confidence": 0.8 }],
  "key_moments": [{ "title": "string", "description": "string", "related_people": ["optional"], "importance": "low|medium|high", "confidence": 0.8 }],
  "emotional_signals": [{ "label": "string", "description": "string", "related_people": ["optional"], "importance": "low|medium|high", "confidence": 0.8 }],
  "memory_facts": [{ "fact": "string", "category": "person|preference|opportunity|commitment|topic|decision|relationship|context", "related_people": ["optional"], "confidence": 0.8 }],
  "tool_suggestions": [{ "tool": "google_calendar", "action": "create_event", "reason": "string", "payload": { "title": "string", "description": "optional", "start_time": "optional ISO", "end_time": "optional ISO", "attendees": [{ "name": "optional", "email": "optional email" }], "related_person_name": "optional", "related_action_title": "optional" }, "requires_approval": true, "confidence": 0.8 }]
}

Transcript:
${transcript}
`;
}

export function buildRepairPrompt(rawOutput: unknown, validationError: string) {
  return `
Repair the following output into valid strict JSON for Vynora's extraction schema.
Return JSON only. Do not add markdown.

Validation error:
${validationError}

Invalid output:
${typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput)}
`;
}
