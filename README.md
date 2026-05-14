# Resona Backend MVP

Resona is a conversation intelligence backend built with Next.js API routes, Supabase, Trigger.dev, Gemini/Google AI, and Google Calendar.

## Implemented Backend Loop

```txt
Audio upload
→ Supabase Storage
→ sessions + processing_jobs
→ Trigger.dev worker
→ Ingestion Engine
→ Transcription Engine
→ Understanding Engine
→ Priority Engine
→ Memory Engine
→ Action Engine
→ approval-based Google Calendar event creation
```

## Six Intelligence Engines

The backend is organized under `src/lib/intelligence` so each engine has one job:

- `ingestion`: validates uploaded audio, normalizes source metadata, and prepares session storage paths.
- `transcription`: produces raw and cleaned transcript layers without overwriting source truth.
- `understanding`: turns transcript text into validated semantic extraction.
- `priority`: scores what deserves attention and writes clarity-first session insights.
- `memory`: evolves person profiles, compressed summaries, and graph edges across conversations.
- `actions`: suggests external tool actions while keeping execution approval-based.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill Supabase, Trigger.dev, Google OAuth, Google AI, and `ENCRYPTION_KEY` values.
3. Apply the Supabase migrations in order, including `20260511072226_resona_backend_mvp.sql` and `20260514073454_six_engine_intelligence.sql`.
4. Install dependencies:

```bash
npm install
```

5. Run the app and worker:

```bash
npm run dev
npm run trigger:dev
```

## Main APIs

```txt
POST /api/sessions/upload
GET  /api/sessions
GET  /api/sessions/:id
GET  /api/sessions/:id/status
POST /api/sessions/:id/reprocess

GET    /api/integrations/google-calendar/connect
GET    /api/integrations/google-calendar/callback
GET    /api/integrations/google-calendar/status
DELETE /api/integrations/google-calendar/disconnect

GET  /api/tool-actions
POST /api/tool-actions/:id/approve
POST /api/tool-actions/:id/dismiss
```

All authenticated APIs expect:

```txt
Authorization: Bearer <supabase-access-token>
```

## Verification

```bash
npm run test
npm run build
```

## Supabase Migration Commands

Apply locally after starting Supabase:

```bash
supabase start
supabase migration up --local
```

Push to a linked Supabase project:

```bash
supabase link --project-ref <project-ref>
supabase db push
```
