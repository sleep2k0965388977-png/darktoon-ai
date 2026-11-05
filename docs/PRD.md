# DARKTOON AI — Product Requirements Document (PRD)

**Version:** 1.0  
**Product Category:** AI-Powered Audio-to-2D Animated Storytelling Studio  
**Default Aesthetic:** Dark Minimalist 2D Animation  
**Animation Engine:** Hybrid 2D Rigging (`RIG_2D`) + AI Image-to-Video (`AI_VIDEO`) + Camera Motion (`STATIC_MOTION`)  
**Core Workflow:** Upload Conversation/Story Audio → AI Speech & Story Analysis → AI Director Storyboard → Character Consistency & Asset Generation → Hybrid 2D Animation → Scene-by-Scene Human Review & Override → Synchronized MP4 Render & Export.

---

## 1. Product Overview

### 1.1. Goal
DARKTOON AI transforms spoken-word audio (podcasts, personal confessions, storytelling, dialogues, self-improvement monologues) into cohesive 2D animated videos. Rather than generating random slideshow images, DARKTOON AI acts as an **AI Animation Director** that:
1. Understands speakers, emotions, subtext, and narrative beats before generating visuals.
2. Segments audio into meaningful narrative scenes based on story beats (never arbitrary fixed-second cuts).
3. Maintains strict character consistency across every scene using locked **Character Profiles** and articulated 2D rigs.
4. Selects the optimal animation method per scene (`RIG_2D`, `AI_VIDEO`, or `STATIC_MOTION`) balancing visual fidelity, consistency, latency, and cost.
5. Synchronizes all character actions, lip movement, camera motion, and subtitles to the master original audio track.
6. Gives creators full scene-by-scene review, regeneration, version rollback, and property editing before rendering the final MP4.

### 1.2. Core Product Principles
- **Never a Slideshow:** Every scene must visually express the action, psychological state, or metaphor of the spoken dialogue.
- **Original Audio is Master:** The uploaded audio is never altered, cut, or re-ordered; all scene timelines lock to the original audio timestamps.
- **Character & Background Reuse:** Characters and backgrounds have persistent IDs (`character_id`, `background_id`) and are reused across scenes unless the script requires a new setting or character.
- **Zero Fake AI Output:** When an external AI provider (ASR, LLM, Image, Video) has no API key configured, the system reports `NOT_CONFIGURED` transparently. A separate **Development Mock Provider** is available for local testing and explicitly labels all mock-generated data with `[MOCK]`.

---

## 2. Visual Standards (`DARK MINIMALIST 2D STORYTELLING`)

### 2.1. Color Palette & UI Theme
- **Main Background:** `#0B0B0D`
- **Sidebar / Navigation:** `#111114`
- **Surface / Panel:** `#18181D`
- **Borders / Hairlines:** `#292930`
- **Primary Text:** `#F5F5F5`
- **Secondary Text:** `#92929B`
- **Accent Red:** `#F04444`
- **Success:** `#22C55E`
- **Warning:** `#F59E0B`

### 2.2. Character System
Each character has a persistent `CharacterProfile`:
- **Identity:** `id`, `name`, `role` (`protagonist`, `deuteragonist`, `antagonist`, `shadow`, `supporting`).
- **Visual Spec:** Off-white/cream fill (`#F4F1EA`) for protagonist, cool gray (`#A1A1AA` / `#CBD5E1`) for secondary speakers, obsidian black (`#09090B`) with crimson rim light (`#F04444`) for shadow/inner-conflict figures.
- **Articulated 2D Rig Layers (8 controllable parts):** `head`, `body`, `left_arm`, `right_arm`, `left_leg`, `right_leg`, `eyes`, `mouth`.
- **10 Mandatory Expressions:** `neutral`, `happy`, `sad`, `angry`, `surprised`, `confused`, `worried`, `tired`, `thinking`, `crying`.
- **17 Mandatory Actions:** `idle`, `walking`, `running`, `sitting`, `standing`, `looking_left_right`, `looking_down`, `turning_head`, `waving`, `holding_phone`, `using_phone`, `opening_door`, `closing_door`, `lying_down`, `falling`, `pointing`, `talking`.

### 2.3. Background Presets
Reusable environment library with persistent `Background ID`:
- `bg_living_room` (Living room with sofa & dim lamp)
- `bg_bedroom` (Bedroom with window & night city glow)
- `bg_desk_workspace` (Late-night desk with monitor light)
- `bg_cafe` (Quiet corner cafe table)
- `bg_night_street` (Rainy minimalist street under streetlight)
- `bg_park_bench` (Park bench under bare tree)
- `bg_bus_stop` (Isolated bus shelter at night)
- `bg_train_station` (Subway/train platform)
- `bg_corridor` (Long perspective hallway)
- `bg_office` (Minimalist corporate workspace)
- `bg_mind_void` (Psychological symbolic dark void with subtle red/blue rim lighting)

---

## 3. End-to-End User Workflow (10 Steps)

1. **Create Project:** Configure name, description, aspect ratio (`16:9`, `9:16`, `1:1`), resolution (`720p`, `1080p`), FPS (`24`/`30`), and language.
2. **Upload Audio:** Drag-and-drop `MP3`, `WAV`, `M4A`, `AAC`, or `FLAC` (plus 1-click built-in sample conversation generator for instant evaluation). View waveform and duration.
3. **Analyze Audio:** ASR transcription with word/segment timestamps, speaker diarization, emotion detection, and narrative arc extraction. User can edit transcript segments and speaker assignments.
4. **AI Director Storyboard Generation:** Splits narrative into semantic scenes with start/end timestamps, purpose, emotion, characters, actions, expressions, props, background, camera shot/movement, animation method, and prompts.
5. **Character Management & Locking:** Inspect/edit character designs, test all 10 expressions & 17 actions on the 2D rig, generate reference sheets, and lock character designs (`locked = true`).
6. **Scene Image & Layer Composition:** Generates/composes background layers, props, and character assets per scene with full asset versioning.
7. **Hybrid Animation Generation:** Routes scenes to `RIG_2D`, `AI_VIDEO`, or `STATIC_MOTION` with explicit decision reasoning and automatic fallback to `RIG_2D`.
8. **Audio & Multi-Track Synchronization:** Locks scene clips, 2D rig keyframes, subtitles, optional background music, and ambient SFX to the master original audio track.
9. **Scene-by-Scene Review & Override:** Approve, mark `NEEDS_REVIEW`, edit prompts/actions/expressions/camera, or regenerate individual scenes without re-running the entire project.
10. **Quality Control, Render & Export:** Runs pre-render QC checks, estimates/tracks provider costs, and renders an H.264 `.mp4` video via FFmpeg.
