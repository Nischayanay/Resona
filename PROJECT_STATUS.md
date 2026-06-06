# Project Status: Vynora

Updated: 2026-06-01

## Current State

Vynora has moved from a zero-state repository to a shipped MVP candidate: a working Next.js app with Supabase-backed auth, private audio upload, a Trigger.dev processing worker, AI transcription/extraction, memory and priority intelligence, approval-based Google Calendar actions, privacy controls, legal pages, branding, and a polished app shell.

The codebase is on `main`, synced with `origin/main` at the time of this update.

## What Shipped

- Built the initial full-stack MVP from scratch.
- Added Supabase Auth, database schema, private Storage bucket, row-level security, and service/browser clients.
- Implemented authenticated app APIs for session upload, session listing, session detail, processing status, and reprocessing.
- Added audio upload flow with session and processing job tracking.
- Built the Trigger.dev worker loop for background conversation processing.
- Added Gemini-powered transcription and structured conversation extraction.
- Added Deepgram-first transcription with Gemini fallback.
- Created extraction schema and prompts for people, action items, opportunities, memory facts, and follow-ups.
- Added normalization into durable tables for people, session people, action items, opportunities, memory facts, and follow-ups.
- Introduced the six-engine intelligence architecture: ingestion, transcription, understanding, priority, memory, and actions.
- Added priority scoring, priority signals, and session insights.
- Added memory profiles, memory edges, and long-term memory summaries.
- Added approval-based tool actions for Google Calendar event creation.
- Implemented Google Calendar OAuth connect, callback, status, disconnect, approve, and dismiss flows.
- Fixed and hardened the calendar OAuth return flow, including testing/error states.
- Added public privacy and terms pages for OAuth verification.
- Added real privacy export and memory deletion APIs.
- Added settings controls for privacy, integrations, and account surfaces.
- Added beta usage caps for uploads and reprocessing.
- Added support for browser `m4a` audio uploads and broader audio MIME normalization.
- Hardened the audio processing pipeline and extraction validation.
- Migrated Trigger.dev integration to v4.
- Added Vercel output configuration and deployment scripts.
- Open-sourced the project with README, MIT license, env template, security notes, and brand assets.
- Rebranded the product surface from Resona to Vynora while retaining Resona visual assets where still used.
- Added Vynora landing page, hero art, app navigation, auth revamp, home revamp, conversations index, session detail view, and responsive UI polish.
- Added the memory orbit logo, favicon, brand imagery, and visual QA screenshots.
- Added unit tests for extraction schema, normalization, audio MIME handling, calendar connect flow, Gemini JSON parsing, beta limits, transcription, priority, memory, and actions.

## Timeline

### May 12, 2026: Foundation

- Created the MVP backend and frontend.
- Added Next.js App Router structure, auth pages, app shell, upload workspace, session detail view, and core APIs.
- Added Supabase migrations for profiles, sessions, transcripts, people, action items, opportunities, memory facts, follow-ups, tool actions, calendar connections/events, processing jobs, and extraction runs.
- Added Trigger.dev processing entrypoint and Vercel output config.
- Fixed Supabase client initialization during prerender.

### May 13, 2026: Processing, Worker, Calendar, Legal

- Added browser `m4a` upload support and audio MIME tests.
- Hardened the worker pipeline, extraction schema, prompts, normalization, and service client behavior.
- Migrated Trigger worker code to Trigger.dev v4.
- Fixed Google Calendar OAuth connect and callback flow.
- Added public privacy and terms pages needed for OAuth verification.

### May 14, 2026: Intelligence System

- Expanded the product from basic extraction into the six-engine intelligence system.
- Added ingestion, transcription, understanding, priority, memory, and actions engines.
- Added priority signals, session insights, memory profiles, memory edges, and long-term summaries.
- Routed conversations to extracted session detail pages.
- Added settings and quiet placeholder surfaces for memory/settings areas.
- Replaced placeholder privacy controls with real export and memory deletion APIs.

### May 15-16, 2026: Product Experience Polish

- Revamped the landing page and core app visual language.
- Improved home, conversations, footer, navbar, and session detail interactions.
- Added scroll-compressing fixed navbar.
- Added memory orbit logo, favicon, and reusable brand mark.
- Continued responsive and desktop UI polish with Playwright screenshots.

### May 17, 2026: Open Source and Beta Safety

- Prepared the project for open-source release with README, MIT license, env template, security notes, and brand assets.
- Added beta usage caps for daily uploads and reprocessing.
- Added UI and API handling for rate limits.

### May 25-29, 2026: Vynora Brand and Reliability

- Revamped the landing page for Vynora branding.
- Added component primitives and refreshed brand assets.
- Revamped auth screens and `/home`.
- Refined home navigation labels.
- Added Deepgram transcription as the primary transcription provider with Gemini fallback.
- Updated docs and privacy language around transcription providers.

### June 1, 2026: Conversation Detail Revamp

- Revamped the conversation page and `SessionDetailView`.
- Improved the detailed review experience for transcript, insights, people, actions, opportunities, memory, follow-ups, and tool actions.

## Current Architecture

```txt
Audio upload
-> Supabase Storage
-> sessions + processing_jobs
-> Trigger.dev worker
-> Ingestion Engine
-> Transcription Engine
-> Understanding Engine
-> Priority Engine
-> Memory Engine
-> Action Engine
-> approval-based Google Calendar event creation
```

## Verification In Repo

- `npm run test` runs the Vitest suite.
- `npm run build` verifies the Next.js production build.
- `npm run trigger:deploy` deploys the Trigger.dev worker.
- `vercel.json` configures the Next.js deployment output.
- `.env.example` documents required Supabase, Trigger.dev, Google OAuth, Google AI, Deepgram, app URL, and encryption settings.

## Remaining Risks / Follow-Ups

- Confirm the latest deployed Vercel URL and Trigger.dev deployment state outside the repo.
- Remove committed Playwright console/page artifacts if they are not intentionally part of the project history.
- Decide whether remaining Resona-named assets should be fully renamed to Vynora or kept as legacy brand files.
- Add end-to-end tests for upload-to-processed-session and calendar approval flows once stable test credentials are available.
- Document production environment setup and launch checklist separately from local setup.
