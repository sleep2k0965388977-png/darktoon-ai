// ============================================================================
// DARKTOON AI — Core Domain Types & Schemas (src/types/darktoon.ts)
// ============================================================================

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type Resolution = "720p" | "1080p";
export type AnimationStyleId =
  | "DARK_MINIMALIST_2D"
  | "CHARCOAL_NOIR_2D"
  | "CRIMSON_VOID_2D";

export type ProjectPipelineStatus =
  | "CREATED"
  | "UPLOADED"
  | "PREPROCESSING"
  | "TRANSCRIBING"
  | "DIARIZING"
  | "ANALYZING"
  | "GENERATING_STORYBOARD"
  | "GENERATING_CHARACTERS"
  | "GENERATING_IMAGES"
  | "GENERATING_ANIMATION"
  | "READY_FOR_REVIEW"
  | "RENDERING"
  | "COMPLETED"
  | "FAILED";

export type SceneStatus =
  | "PENDING"
  | "GENERATING"
  | "GENERATED"
  | "APPROVED"
  | "NEEDS_REVIEW"
  | "FAILED";

export type AnimationMethod = "RIG_2D" | "AI_VIDEO" | "STATIC_MOTION";

// Section 2.3: Minimum 10 Character Expressions
export type CharacterExpression =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "confused"
  | "worried"
  | "tired"
  | "thinking"
  | "crying";

export const ALL_EXPRESSIONS: CharacterExpression[] = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "surprised",
  "confused",
  "worried",
  "tired",
  "thinking",
  "crying",
];

// Section 2.4: Minimum 17 Character Actions
export type CharacterAction =
  | "idle"
  | "walking"
  | "running"
  | "sitting"
  | "standing"
  | "looking_left_right"
  | "looking_down"
  | "turning_head"
  | "waving"
  | "holding_phone"
  | "using_phone"
  | "opening_door"
  | "closing_door"
  | "lying_down"
  | "falling"
  | "pointing"
  | "talking";

export const ALL_ACTIONS: CharacterAction[] = [
  "idle",
  "walking",
  "running",
  "sitting",
  "standing",
  "looking_left_right",
  "looking_down",
  "turning_head",
  "waving",
  "holding_phone",
  "using_phone",
  "opening_door",
  "closing_door",
  "lying_down",
  "falling",
  "pointing",
  "talking",
];

// Section 2.5: Reusable Background IDs
export type BackgroundPresetId =
  | "bg_living_room"
  | "bg_bedroom"
  | "bg_desk_workspace"
  | "bg_cafe"
  | "bg_night_street"
  | "bg_park_bench"
  | "bg_bus_stop"
  | "bg_train_station"
  | "bg_corridor"
  | "bg_office"
  | "bg_mind_void";

export interface BackgroundPreset {
  id: BackgroundPresetId;
  name: string;
  category: "indoor" | "outdoor" | "symbolic";
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentGlow: string;
  defaultProps: string[];
}

export type CameraShot = "wide" | "medium" | "close_up" | "extreme_close_up";
export type CameraMovement =
  | "static"
  | "slow_push_in"
  | "slow_pull_out"
  | "pan_left"
  | "pan_right"
  | "subtle_drift";

export interface User {
  id: string;
  email: string;
  display_name: string;
  auth_provider: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: ProjectPipelineStatus;
  aspect_ratio: AspectRatio;
  resolution: Resolution;
  fps: number;
  style_id: AnimationStyleId;
  language: string;
  original_audio_asset_id: string | null;
  budget_limit_usd: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AudioAsset {
  id: string;
  project_id: string;
  file_name: string;
  storage_key: string;
  format: string;
  duration: number;
  sample_rate: number;
  channels: number;
  file_size: number;
  waveform: number[];
  created_at: string;
}

export interface Speaker {
  id: string;
  project_id: string;
  speaker_code: string;
  display_name: string;
  description: string;
  voice_characteristics: {
    pitch?: string;
    pace?: string;
    tone?: string;
    linked_character_id?: string;
  };
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  id: string;
  transcript_id: string;
  speaker_id: string | null;
  speaker_name?: string;
  start_time: number;
  end_time: number;
  text: string;
  confidence: number;
  emotion: CharacterExpression;
  sequence_index: number;
  words: WordTimestamp[];
}

export interface StoryAnalysis {
  summary: string;
  main_topic: string;
  story_structure: {
    setup: string;
    conflict: string;
    resolution: string;
  };
  explicit_facts: string[];
  contextual_inferences: string[];
  visual_metaphors: string[];
  emotional_arc: Array<{
    phase: string;
    emotion: CharacterExpression;
    intensity: number;
    description: string;
  }>;
  narrative_segments: Array<{
    index: number;
    start_time: number;
    end_time: number;
    purpose: string;
    summary: string;
  }>;
}

export interface Transcript {
  id: string;
  project_id: string;
  audio_asset_id: string;
  language: string;
  full_text: string;
  story_analysis: StoryAnalysis;
  is_mock: boolean;
  version: number;
  status: string;
  created_at: string;
  segments: TranscriptSegment[];
}

// Section 2.2 & Step 7: 8 Controllable Rig Layers + Profile
export interface CharacterRigLayers {
  head: { shape: "round" | "oval" | "hooded"; scale: number; accessory?: string };
  body: { torsoType: "minimal" | "cloak" | "jacket"; width: number; height: number };
  left_arm: { length: number; thickness: number };
  right_arm: { length: number; thickness: number };
  left_leg: { length: number; thickness: number };
  right_leg: { length: number; thickness: number };
  eyes: { style: "dot" | "slit" | "hollow" | "glow"; color: string };
  mouth: { style: "line" | "minimal_arc" | "muted"; color: string };
}

export interface CharacterColorPalette {
  fill: string;
  stroke: string;
  accent: string;
  shadow: string;
  rimLight?: string;
}

export interface CharacterProfile {
  id: string;
  project_id: string;
  name: string;
  role: "protagonist" | "deuteragonist" | "antagonist" | "shadow" | "supporting";
  design_description: string;
  color_palette: CharacterColorPalette;
  proportions: {
    head_ratio: number;
    body_ratio: number;
    limb_slenderness: number;
    height_scale: number;
  };
  expressions: CharacterExpression[];
  poses: string[];
  actions: CharacterAction[];
  layers: CharacterRigLayers;
  reference_asset_id: string | null;
  locked: boolean;
  created_at: string;
}

export interface SceneCharacterPlacement {
  id?: string;
  scene_id?: string;
  character_id: string;
  character_name?: string;
  action: CharacterAction;
  expression: CharacterExpression;
  position: "left" | "center" | "right" | "foreground" | "background";
  layer_order: number;
}

export interface SceneProp {
  type:
    | "sofa"
    | "smartphone"
    | "window"
    | "desk"
    | "lamp"
    | "coffee_cup"
    | "street_lamp"
    | "bench"
    | "door"
    | "bed"
    | "rain"
    | "clock"
    | "mirror";
  position: "left" | "center" | "right" | "background" | "foreground";
  scale?: number;
}

export interface SceneAnimationActionKeyframe {
  target: string;
  action: string;
  start: number;
  duration: number;
}

// Section IV: Standardized Scene JSON
export interface SceneRecord {
  id: string;
  project_id: string;
  sequence_index: number;
  title: string;
  start_time: number;
  end_time: number;
  transcript_text: string;
  narrative_purpose: string;
  emotion: {
    primary: CharacterExpression;
    intensity: number;
  };
  visual_description: string;
  camera_direction: {
    shot: CameraShot;
    movement: CameraMovement;
  };
  animation_method: AnimationMethod;
  animation_reason: string;
  background: {
    asset_id: BackgroundPresetId;
    description: string;
  };
  props: SceneProp[];
  transition: {
    type: "cut" | "fade" | "dissolve" | "wipe";
    duration: number;
  };
  image_prompt: string;
  motion_prompt: string;
  negative_prompt: string;
  quality_issues: string[];
  is_mock: boolean;
  status: SceneStatus;
  version: number;
  characters: SceneCharacterPlacement[];
  primary_asset?: AssetRecord | null;
  animation_clip?: AnimationClipRecord | null;
}

export interface AssetRecord {
  id: string;
  project_id: string;
  scene_id: string | null;
  asset_type:
    | "scene_image"
    | "character_reference"
    | "background"
    | "animation_clip"
    | "rendered_video"
    | "audio";
  storage_key: string;
  provider: string;
  model: string;
  prompt: string;
  width: number;
  height: number;
  duration: number;
  metadata: Record<string, unknown>;
  is_mock: boolean;
  version: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  created_at: string;
}

export interface AnimationClipRecord {
  id: string;
  scene_id: string;
  method: AnimationMethod;
  animation_config: {
    actions: SceneAnimationActionKeyframe[];
    camera: { shot: CameraShot; movement: CameraMovement };
    lip_sync_enabled: boolean;
    fallback_applied?: boolean;
    fallback_reason?: string;
  };
  asset_id: string | null;
  start_time: number;
  end_time: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
}

export interface GenerationJob {
  id: string;
  project_id: string;
  scene_id: string | null;
  job_type:
    | "AUDIO_PREPROCESS"
    | "ASR_TRANSCRIBE"
    | "SPEAKER_DIARIZE"
    | "STORY_ANALYZE"
    | "STORYBOARD_GENERATE"
    | "CHARACTER_GENERATE"
    | "SCENE_IMAGE"
    | "SCENE_ANIMATION"
    | "VIDEO_RENDER";
  provider: string;
  model: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  retry_count: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface QualityControlIssue {
  scene_id?: string;
  scene_index?: number;
  severity: "error" | "warning";
  code:
    | "MISSING_IMAGE"
    | "MISSING_ANIMATION"
    | "DUPLICATE_SCENE"
    | "TIMELINE_ORDER_ERROR"
    | "MISSING_DIALOGUE_COVERAGE"
    | "CHARACTER_DESIGN_MISMATCH"
    | "ABNORMAL_DURATION"
    | "AUDIO_SYNC_DRIFT";
  message: string;
}

export interface QualityControlReport {
  passed: boolean;
  checked_at: string;
  total_scenes: number;
  approved_scenes: number;
  needs_review_scenes: number;
  audio_coverage_ratio: number;
  issues: QualityControlIssue[];
}

export interface RenderJob {
  id: string;
  project_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress: number;
  output_asset_id: string | null;
  quality_report: QualityControlReport;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TimelineTrack {
  id: string;
  project_id: string;
  track_type: "audio_master" | "scene" | "animation" | "subtitle" | "music" | "sfx";
  name: string;
  order_index: number;
  muted: boolean;
  volume: number;
  clips: TimelineClip[];
}

export interface TimelineClip {
  id: string;
  track_id: string;
  scene_id: string | null;
  asset_id: string | null;
  start_time: number;
  end_time: number;
  offset: number;
  metadata: Record<string, unknown>;
}

export interface CostRecord {
  id: string;
  project_id: string;
  scene_id: string | null;
  provider: string;
  model: string;
  operation: string;
  usage: Record<string, unknown>;
  estimated_cost_usd: number;
  actual_cost_usd: number;
  created_at: string;
}

export interface ProviderStatusInfo {
  capability: "asr" | "diarization" | "llm" | "image" | "video";
  active_provider: "openai" | "gemini" | "replicate" | "mock";
  configured: boolean;
  status: "CONFIGURED" | "NOT_CONFIGURED" | "DEV_MOCK_ACTIVE";
  model: string;
  message: string;
}
