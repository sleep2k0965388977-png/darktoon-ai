-- ============================================================================
-- DARKTOON AI — PostgreSQL Schema Migration (001_postgres_schema.sql)
-- Uses UUID and JSONB types for containerized PostgreSQL deployment
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  auth_provider VARCHAR(64) NOT NULL DEFAULT 'local',
  display_name VARCHAR(255) NOT NULL DEFAULT 'Creator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(64) NOT NULL DEFAULT 'CREATED',
  aspect_ratio VARCHAR(16) NOT NULL DEFAULT '16:9',
  resolution VARCHAR(16) NOT NULL DEFAULT '1080p',
  fps INTEGER NOT NULL DEFAULT 24,
  style_id VARCHAR(64) NOT NULL DEFAULT 'DARK_MINIMALIST_2D',
  language VARCHAR(16) NOT NULL DEFAULT 'vi',
  original_audio_asset_id UUID,
  budget_limit_usd NUMERIC(10, 4) NOT NULL DEFAULT 10.0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS audio_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name VARCHAR(512) NOT NULL,
  storage_key TEXT NOT NULL,
  format VARCHAR(32) NOT NULL,
  duration DOUBLE PRECISION NOT NULL,
  sample_rate INTEGER NOT NULL DEFAULT 44100,
  channels INTEGER NOT NULL DEFAULT 2,
  file_size BIGINT NOT NULL DEFAULT 0,
  waveform_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  audio_asset_id UUID NOT NULL REFERENCES audio_assets(id) ON DELETE CASCADE,
  language VARCHAR(16) NOT NULL DEFAULT 'vi',
  full_text TEXT NOT NULL DEFAULT '',
  story_analysis_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_mock BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(64) NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  speaker_code VARCHAR(64) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  voice_characteristics JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES speakers(id) ON DELETE SET NULL,
  start_time DOUBLE PRECISION NOT NULL,
  end_time DOUBLE PRECISION NOT NULL,
  text TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.95,
  emotion VARCHAR(64) NOT NULL DEFAULT 'neutral',
  sequence_index INTEGER NOT NULL,
  words_json JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL DEFAULT 'protagonist',
  design_description TEXT NOT NULL DEFAULT '',
  color_palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  proportions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  expressions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  poses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  layers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reference_asset_id UUID,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS character_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  asset_type VARCHAR(64) NOT NULL,
  storage_key TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sequence_index INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  start_time DOUBLE PRECISION NOT NULL,
  end_time DOUBLE PRECISION NOT NULL,
  transcript_text TEXT NOT NULL,
  narrative_purpose TEXT NOT NULL DEFAULT '',
  emotion JSONB NOT NULL DEFAULT '{"primary":"neutral","intensity":0.5}'::jsonb,
  visual_description TEXT NOT NULL DEFAULT '',
  camera_direction JSONB NOT NULL DEFAULT '{"shot":"medium","movement":"slow_push_in"}'::jsonb,
  animation_method VARCHAR(32) NOT NULL DEFAULT 'RIG_2D',
  animation_reason TEXT NOT NULL DEFAULT '',
  background_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  props_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  transition_json JSONB NOT NULL DEFAULT '{"type":"fade","duration":0.4}'::jsonb,
  image_prompt TEXT NOT NULL DEFAULT '',
  motion_prompt TEXT NOT NULL DEFAULT '',
  negative_prompt TEXT NOT NULL DEFAULT '',
  quality_issues_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_mock BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS scene_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL DEFAULT 'idle',
  expression VARCHAR(64) NOT NULL DEFAULT 'neutral',
  position VARCHAR(32) NOT NULL DEFAULT 'center',
  layer_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id UUID,
  asset_type VARCHAR(64) NOT NULL,
  storage_key TEXT NOT NULL,
  provider VARCHAR(64) NOT NULL,
  model VARCHAR(128) NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  duration DOUBLE PRECISION NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_mock BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scene_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  asset_role VARCHAR(64) NOT NULL DEFAULT 'primary_visual',
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS animation_clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  method VARCHAR(32) NOT NULL,
  animation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  asset_id UUID,
  start_time DOUBLE PRECISION NOT NULL,
  end_time DOUBLE PRECISION NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED'
);

CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  progress INTEGER NOT NULL DEFAULT 0,
  output_asset_id UUID,
  quality_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id UUID,
  job_type VARCHAR(64) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  model VARCHAR(128) NOT NULL,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS timeline_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  track_type VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  volume DOUBLE PRECISION NOT NULL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS timeline_clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id UUID NOT NULL REFERENCES timeline_tracks(id) ON DELETE CASCADE,
  scene_id UUID,
  asset_id UUID,
  start_time DOUBLE PRECISION NOT NULL,
  end_time DOUBLE PRECISION NOT NULL,
  offset DOUBLE PRECISION NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS project_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id UUID,
  provider VARCHAR(64) NOT NULL,
  model VARCHAR(128) NOT NULL,
  operation VARCHAR(64) NOT NULL,
  usage_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  actual_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
