-- ============================================================================
-- DARKTOON AI — Relational Schema Migration (001_initial_schema.sql)
-- Implements all 18 required PRD tables + cost_records + provider_configs
-- ============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  display_name TEXT NOT NULL DEFAULT 'Creator',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'CREATED',
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  resolution TEXT NOT NULL DEFAULT '1080p',
  fps INTEGER NOT NULL DEFAULT 24,
  style_id TEXT NOT NULL DEFAULT 'DARK_MINIMALIST_2D',
  language TEXT NOT NULL DEFAULT 'vi',
  original_audio_asset_id TEXT,
  budget_limit_usd REAL NOT NULL DEFAULT 10.0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS audio_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  format TEXT NOT NULL,
  duration REAL NOT NULL,
  sample_rate INTEGER NOT NULL DEFAULT 44100,
  channels INTEGER NOT NULL DEFAULT 2,
  file_size INTEGER NOT NULL DEFAULT 0,
  waveform_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audio_assets_project_id ON audio_assets(project_id);

CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  audio_asset_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'vi',
  full_text TEXT NOT NULL DEFAULT '',
  story_analysis_json TEXT NOT NULL DEFAULT '{}',
  is_mock INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (audio_asset_id) REFERENCES audio_assets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transcripts_project_id ON transcripts(project_id);

CREATE TABLE IF NOT EXISTS speakers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  speaker_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  voice_characteristics TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_speakers_project_id ON speakers(project_id);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id TEXT PRIMARY KEY,
  transcript_id TEXT NOT NULL,
  speaker_id TEXT,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  text TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.95,
  emotion TEXT NOT NULL DEFAULT 'neutral',
  sequence_index INTEGER NOT NULL,
  words_json TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE,
  FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transcript_segments_transcript_id ON transcript_segments(transcript_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_timestamps ON transcript_segments(start_time, end_time);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'protagonist',
  design_description TEXT NOT NULL DEFAULT '',
  color_palette TEXT NOT NULL DEFAULT '{}',
  proportions_json TEXT NOT NULL DEFAULT '{}',
  expressions_json TEXT NOT NULL DEFAULT '[]',
  poses_json TEXT NOT NULL DEFAULT '[]',
  actions_json TEXT NOT NULL DEFAULT '[]',
  layers_json TEXT NOT NULL DEFAULT '{}',
  reference_asset_id TEXT,
  locked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);

CREATE TABLE IF NOT EXISTS character_assets (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_character_assets_character_id ON character_assets(character_id);

CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  sequence_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  transcript_text TEXT NOT NULL,
  narrative_purpose TEXT NOT NULL DEFAULT '',
  emotion TEXT NOT NULL DEFAULT '{"primary":"neutral","intensity":0.5}',
  visual_description TEXT NOT NULL DEFAULT '',
  camera_direction TEXT NOT NULL DEFAULT '{"shot":"medium","movement":"slow_push_in"}',
  animation_method TEXT NOT NULL DEFAULT 'RIG_2D',
  animation_reason TEXT NOT NULL DEFAULT '',
  background_json TEXT NOT NULL DEFAULT '{}',
  props_json TEXT NOT NULL DEFAULT '[]',
  transition_json TEXT NOT NULL DEFAULT '{"type":"fade","duration":0.4}',
  image_prompt TEXT NOT NULL DEFAULT '',
  motion_prompt TEXT NOT NULL DEFAULT '',
  negative_prompt TEXT NOT NULL DEFAULT '',
  quality_issues_json TEXT NOT NULL DEFAULT '[]',
  is_mock INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_status ON scenes(status);
CREATE INDEX IF NOT EXISTS idx_scenes_timestamps ON scenes(start_time, end_time);

CREATE TABLE IF NOT EXISTS scene_characters (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'idle',
  expression TEXT NOT NULL DEFAULT 'neutral',
  position TEXT NOT NULL DEFAULT 'center',
  layer_order INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scene_characters_scene_id ON scene_characters(scene_id);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_id TEXT,
  asset_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  duration REAL NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  is_mock INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_scene_id ON assets(scene_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

CREATE TABLE IF NOT EXISTS scene_assets (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  asset_role TEXT NOT NULL DEFAULT 'primary_visual',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scene_assets_scene_id ON scene_assets(scene_id);

CREATE TABLE IF NOT EXISTS animation_clips (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  method TEXT NOT NULL,
  animation_config TEXT NOT NULL DEFAULT '{}',
  asset_id TEXT,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_animation_clips_scene_id ON animation_clips(scene_id);

CREATE TABLE IF NOT EXISTS render_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  progress INTEGER NOT NULL DEFAULT 0,
  output_asset_id TEXT,
  quality_report_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_project_id ON render_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_id TEXT,
  job_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_payload TEXT NOT NULL DEFAULT '{}',
  output_payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_project_id ON generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_scene_id ON generation_jobs(scene_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);

CREATE TABLE IF NOT EXISTS timeline_tracks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  track_type TEXT NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  muted INTEGER NOT NULL DEFAULT 0,
  volume REAL NOT NULL DEFAULT 1.0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timeline_tracks_project_id ON timeline_tracks(project_id);

CREATE TABLE IF NOT EXISTS timeline_clips (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  scene_id TEXT,
  asset_id TEXT,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  offset REAL NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (track_id) REFERENCES timeline_tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timeline_clips_track_id ON timeline_clips(track_id);

CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);

CREATE TABLE IF NOT EXISTS cost_records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_id TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  usage_json TEXT NOT NULL DEFAULT '{}',
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  actual_cost_usd REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cost_records_project_id ON cost_records(project_id);

CREATE TABLE IF NOT EXISTS provider_configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
