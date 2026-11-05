# DARKTOON AI — Implementation Plan (`IMPLEMENTATION_PLAN.md`)

## Phase-by-Phase Execution Roadmap

### Phase 1: Project Setup, Auth, 18-Table Database, Storage & Audio Upload
- Initialize `darktoon-ai/` Next.js + TypeScript + Tailwind CSS project with Dark Minimalist (`#0B0B0D`) studio theme.
- Implement relational database engine (`node:sqlite` + SQL migrations in `migrations/001_initial_schema.sql` & PostgreSQL DDL in `migrations/001_postgres_schema.sql`) covering all 18 required tables + `cost_records`.
- Implement Authentication (`/api/v1/auth/register`, `login`, `logout`, `me`) with session tokens and project ownership checks.
- Implement S3-compatible Local Object Storage service (`src/backend/storage/storageService.ts`) with authorized asset streaming.
- Implement Project CRUD (`/api/v1/projects`) and Audio Upload (`/api/v1/projects/{id}/audio/upload`) + built-in sample WAV dialogue generator for immediate end-to-end testing.

### Phase 2: Audio Preprocessing, ASR Transcription, Speaker Diarization & Story Analysis
- Implement Audio Preprocessing (duration, sample rate, channels, waveform peak generation without modifying original audio).
- Implement `ASRProvider`, `DiarizationProvider`, and `LLMProvider` interfaces + OpenAI, Gemini, and explicit `[MOCK]` Development adapters.
- Implement `/api/v1/projects/{id}/audio/analyze`, `/api/v1/projects/{id}/transcript` (GET/PATCH), and `/api/v1/projects/{id}/transcript/reanalyze`.
- Build Interactive Waveform Player & Transcript/Speaker Editor UI.

### Phase 3: AI Story Director, Storyboard Engine & Character Consistency System
- Implement `StoryDirectorService` to segment transcripts semantically into scenes (`scenes`, `scene_characters`, `scene_assets`) with narrative purpose, emotion, camera direction, actions, expressions, props, and prompts.
- Implement `CharacterService` with persistent `CharacterProfile`, 8-part 2D rig definitions, 10 expressions, 17 actions, reference generation, and `locked` design enforcement (`/api/v1/projects/{id}/characters`, `/api/v1/characters/{id}/lock`).

### Phase 4: Scene Image Composition, Asset Versioning & 2D Character Rig Engine
- Implement `ImageProvider` + Dark Minimalist 2D SVG/Canvas Scene Composer that reuses backgrounds (`bg_living_room`, `bg_bedroom`, `bg_night_street`, etc.) and locked character rigs.
- Store every generated image/layer as a versioned record in `assets` and `scene_assets` (preserving previous versions for rollback).
- Build articulated 8-part SVG Character Rig component (`Head`, `Body`, `Left Arm`, `Right Arm`, `Left Leg`, `Right Leg`, `Eyes`, `Mouth`) supporting all 10 expressions and 17 actions + lip-sync when speaking.

### Phase 5: Hybrid Animation Router, AI Image-to-Video Adapter & Multi-Track Timeline
- Implement `AnimationRouter` (`RIG_2D`, `AI_VIDEO`, `STATIC_MOTION`) with explicit decision reasoning and automatic fallback to `RIG_2D`.
- Implement `VideoProvider` interface and scene regeneration endpoints (`/api/v1/scenes/{id}/regenerate-image`, `/api/v1/scenes/{id}/regenerate-animation`).
- Build the 3-Column Storyboard Editor + 6-Track Timeline (`Audio Master`, `Scene Track`, `Animation/Rig Track`, `Subtitles`, `Background Music`, `SFX`) + Interactive Scene Stage Player.

### Phase 6: Quality Control, Cost Tracking, Synchronized FFmpeg MP4 Render & Export
- Implement `QualityControlService` (validates missing images/animations, timeline continuity, speaker sync, character lock compliance, and flags `NEEDS_REVIEW`).
- Implement `CostTrackingService` (estimates generation cost, enforces project budget caps, logs usage per provider/model).
- Implement `VideoRenderService` using `ffmpeg-static` to render real H.264 `.mp4` video (`16:9`, `9:16`, `1:1` in `720p` or `1080p`) synchronized to the master original audio track with optional subtitles and background music.

### Phase 7: Automated Testing, Verification & Documentation
- Write and run automated unit & integration tests covering Auth, Project CRUD, Audio Upload & Analysis, Transcript Persistence, Storyboard Generation, Character Lock Consistency, Scene Regeneration & Versioning, Animation Routing, Job Retry/Cancel, Quality Control, Storage Authorization, and MP4 Video Rendering.
- Verify the live web application end-to-end.
