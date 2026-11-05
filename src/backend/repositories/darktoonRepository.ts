// ============================================================================
// DARKTOON AI — Unified Repository Layer (src/backend/repositories/darktoonRepository.ts)
// ============================================================================

import crypto from "node:crypto";
import { getDb } from "../db/database.ts";
import {
  ALL_ACTIONS,
  ALL_EXPRESSIONS,
} from "../../types/darktoon.ts";
import type {
  AnimationClipRecord,
  AnimationMethod,
  AssetRecord,
  AudioAsset,
  CharacterProfile,
  CostRecord,
  GenerationJob,
  Project,
  ProjectPipelineStatus,
  QualityControlReport,
  RenderJob,
  SceneCharacterPlacement,
  SceneRecord,
  SceneStatus,
  Speaker,
  StoryAnalysis,
  TimelineClip,
  TimelineTrack,
  Transcript,
  TranscriptSegment,
  User,
} from "../../types/darktoon.ts";
import { DEFAULT_CHARACTER_PALETTES } from "../animations/presets.ts";

function nowIso(): string {
  return new Date().toISOString();
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class DarktoonRepository {
  // --------------------------------------------------------------------------
  // 1. Users & Authentication
  // --------------------------------------------------------------------------
  static getOrCreateDefaultUser(): User {
    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM users ORDER BY created_at ASC LIMIT 1")
      .get() as Record<string, unknown> | undefined;
    if (existing) {
      return {
        id: String(existing.id),
        email: String(existing.email),
        display_name: String(existing.display_name || "Darktoon Director"),
        auth_provider: String(existing.auth_provider || "local"),
        created_at: String(existing.created_at),
        updated_at: String(existing.updated_at),
      };
    }

    const id = crypto.randomUUID();
    const now = nowIso();
    const hash = crypto
      .createHash("sha256")
      .update("darktoon123")
      .digest("hex");
    db.prepare(
      `INSERT INTO users (id, email, password_hash, auth_provider, display_name, created_at, updated_at)
       VALUES (?, ?, ?, 'local', 'Darktoon Director', ?, ?)`
    ).run(id, "director@darktoon.ai", hash, now, now);

    return {
      id,
      email: "director@darktoon.ai",
      display_name: "Darktoon Director",
      auth_provider: "local",
      created_at: now,
      updated_at: now,
    };
  }

  static registerUser(
    email: string,
    password: string,
    displayName: string = "Creator"
  ): User {
    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    const existing = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(normalizedEmail);
    if (existing) {
      throw new Error("USER_EMAIL_ALREADY_EXISTS");
    }

    const id = crypto.randomUUID();
    const now = nowIso();
    const passwordHash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");
    db.prepare(
      `INSERT INTO users (id, email, password_hash, auth_provider, display_name, created_at, updated_at)
       VALUES (?, ?, ?, 'local', ?, ?, ?)`
    ).run(id, normalizedEmail, passwordHash, displayName, now, now);

    return {
      id,
      email: normalizedEmail,
      display_name: displayName,
      auth_provider: "local",
      created_at: now,
      updated_at: now,
    };
  }

  static authenticateUser(email: string, password: string): User | null {
    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");
    const row = db
      .prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?")
      .get(normalizedEmail, passwordHash) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      email: String(row.email),
      display_name: String(row.display_name || "Creator"),
      auth_provider: String(row.auth_provider || "local"),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  }

  static getUserById(userId: string): User | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      email: String(row.email),
      display_name: String(row.display_name || "Creator"),
      auth_provider: String(row.auth_provider || "local"),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  }

  // --------------------------------------------------------------------------
  // 2. Projects & Versioning
  // --------------------------------------------------------------------------
  private static mapProject(row: Record<string, unknown>): Project {
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      name: String(row.name),
      description: String(row.description || ""),
      status: String(row.status) as ProjectPipelineStatus,
      aspect_ratio: (row.aspect_ratio as Project["aspect_ratio"]) || "16:9",
      resolution: (row.resolution as Project["resolution"]) || "1080p",
      fps: Number(row.fps || 24),
      style_id: (row.style_id as Project["style_id"]) || "DARK_MINIMALIST_2D",
      language: String(row.language || "vi"),
      original_audio_asset_id: row.original_audio_asset_id
        ? String(row.original_audio_asset_id)
        : null,
      budget_limit_usd: Number(row.budget_limit_usd ?? 10.0),
      deleted_at: row.deleted_at ? String(row.deleted_at) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  }

  static listProjects(userId?: string): Project[] {
    const db = getDb();
    const rows = userId
      ? (db
          .prepare(
            "SELECT * FROM projects WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC"
          )
          .all(userId) as Record<string, unknown>[])
      : (db
          .prepare(
            "SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY updated_at DESC"
          )
          .all() as Record<string, unknown>[]);
    return rows.map((r) => this.mapProject(r));
  }

  static getProject(projectId: string): Project | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL")
      .get(projectId) as Record<string, unknown> | undefined;
    return row ? this.mapProject(row) : null;
  }

  static createProject(params: {
    user_id: string;
    name: string;
    description?: string;
    aspect_ratio?: Project["aspect_ratio"];
    resolution?: Project["resolution"];
    fps?: number;
    style_id?: Project["style_id"];
    language?: string;
    budget_limit_usd?: number;
  }): Project {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = nowIso();
    db.prepare(
      `INSERT INTO projects (
        id, user_id, name, description, status, aspect_ratio, resolution, fps,
        style_id, language, budget_limit_usd, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'CREATED', ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.user_id,
      params.name.trim(),
      params.description?.trim() || "",
      params.aspect_ratio || "16:9",
      params.resolution || "1080p",
      params.fps || 24,
      params.style_id || "DARK_MINIMALIST_2D",
      params.language || "vi",
      params.budget_limit_usd ?? 10.0,
      now,
      now
    );

    // Initialize default 6 timeline tracks per PRD 4.2.D
    const defaultTracks: Array<{
      type: TimelineTrack["track_type"];
      name: string;
      volume: number;
    }> = [
      { type: "audio_master", name: "Audio gốc (Master Dialogue)", volume: 1.0 },
      { type: "scene", name: "Phân cảnh (Storyboard Scenes)", volume: 1.0 },
      { type: "animation", name: "Chuyển động (2D Rig / AI Video)", volume: 1.0 },
      { type: "subtitle", name: "Phụ đề (Subtitles)", volume: 1.0 },
      { type: "music", name: "Nhạc nền (Ambient BGM)", volume: 0.25 },
      { type: "sfx", name: "Hiệu ứng âm thanh (SFX)", volume: 0.5 },
    ];
    defaultTracks.forEach((tr, idx) => {
      db.prepare(
        `INSERT INTO timeline_tracks (id, project_id, track_type, name, order_index, muted, volume)
         VALUES (?, ?, ?, ?, ?, 0, ?)`
      ).run(crypto.randomUUID(), id, tr.type, tr.name, idx + 1, tr.volume);
    });

    return this.getProject(id)!;
  }

  static updateProject(
    projectId: string,
    updates: Partial<
      Pick<
        Project,
        | "name"
        | "description"
        | "status"
        | "aspect_ratio"
        | "resolution"
        | "fps"
        | "style_id"
        | "language"
        | "original_audio_asset_id"
        | "budget_limit_usd"
      >
    >
  ): Project | null {
    const existing = this.getProject(projectId);
    if (!existing) return null;
    const db = getDb();
    const now = nowIso();
    db.prepare(
      `UPDATE projects SET
        name = ?,
        description = ?,
        status = ?,
        aspect_ratio = ?,
        resolution = ?,
        fps = ?,
        style_id = ?,
        language = ?,
        original_audio_asset_id = ?,
        budget_limit_usd = ?,
        updated_at = ?
       WHERE id = ?`
    ).run(
      updates.name ?? existing.name,
      updates.description ?? existing.description,
      updates.status ?? existing.status,
      updates.aspect_ratio ?? existing.aspect_ratio,
      updates.resolution ?? existing.resolution,
      updates.fps ?? existing.fps,
      updates.style_id ?? existing.style_id,
      updates.language ?? existing.language,
      updates.original_audio_asset_id !== undefined
        ? updates.original_audio_asset_id
        : existing.original_audio_asset_id,
      updates.budget_limit_usd ?? existing.budget_limit_usd,
      now,
      projectId
    );
    return this.getProject(projectId);
  }

  static softDeleteProject(projectId: string): boolean {
    const db = getDb();
    const now = nowIso();
    const res = db
      .prepare("UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, projectId);
    return res.changes > 0;
  }

  static createProjectVersionSnapshot(projectId: string): number {
    const db = getDb();
    const project = this.getProject(projectId);
    if (!project) return 0;
    const last = db
      .prepare(
        "SELECT MAX(version_number) as max_v FROM project_versions WHERE project_id = ?"
      )
      .get(projectId) as { max_v: number | null } | undefined;
    const nextVersion = (last?.max_v || 0) + 1;
    const scenes = this.getScenesByProject(projectId);
    const characters = this.getCharactersByProject(projectId);
    const snapshot = JSON.stringify({
      project,
      scenes,
      characters,
      saved_at: nowIso(),
    });
    db.prepare(
      `INSERT INTO project_versions (id, project_id, version_number, snapshot, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), projectId, nextVersion, snapshot, nowIso());
    return nextVersion;
  }

  // --------------------------------------------------------------------------
  // 3. Audio Assets
  // --------------------------------------------------------------------------
  static createAudioAsset(params: {
    project_id: string;
    file_name: string;
    storage_key: string;
    format: string;
    duration: number;
    sample_rate?: number;
    channels?: number;
    file_size: number;
    waveform: number[];
  }): AudioAsset {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = nowIso();
    db.prepare(
      `INSERT INTO audio_assets (
        id, project_id, file_name, storage_key, format, duration, sample_rate,
        channels, file_size, waveform_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.project_id,
      params.file_name,
      params.storage_key,
      params.format,
      params.duration,
      params.sample_rate || 44100,
      params.channels || 2,
      params.file_size,
      JSON.stringify(params.waveform),
      now
    );

    this.updateProject(params.project_id, {
      original_audio_asset_id: id,
      status: "UPLOADED",
    });

    return this.getAudioAsset(id)!;
  }

  static getAudioAsset(audioAssetId: string): AudioAsset | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM audio_assets WHERE id = ?")
      .get(audioAssetId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      project_id: String(row.project_id),
      file_name: String(row.file_name),
      storage_key: String(row.storage_key),
      format: String(row.format),
      duration: Number(row.duration),
      sample_rate: Number(row.sample_rate),
      channels: Number(row.channels),
      file_size: Number(row.file_size),
      waveform: safeJsonParse<number[]>(row.waveform_json, []),
      created_at: String(row.created_at),
    };
  }

  static getProjectAudio(projectId: string): AudioAsset | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    if (project.original_audio_asset_id) {
      return this.getAudioAsset(project.original_audio_asset_id);
    }
    const db = getDb();
    const row = db
      .prepare(
        "SELECT * FROM audio_assets WHERE project_id = ? ORDER BY created_at DESC LIMIT 1"
      )
      .get(projectId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.getAudioAsset(String(row.id));
  }

  // --------------------------------------------------------------------------
  // 4. Speakers & Transcripts
  // --------------------------------------------------------------------------
  static saveSpeakers(
    projectId: string,
    speakersInput: Array<{
      speaker_code: string;
      display_name: string;
      description: string;
      voice_characteristics?: Record<string, unknown>;
    }>
  ): Speaker[] {
    const db = getDb();
    db.prepare("DELETE FROM speakers WHERE project_id = ?").run(projectId);
    const result: Speaker[] = [];
    for (const spk of speakersInput) {
      const id = crypto.randomUUID();
      const vc = spk.voice_characteristics || {};
      db.prepare(
        `INSERT INTO speakers (id, project_id, speaker_code, display_name, description, voice_characteristics)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        projectId,
        spk.speaker_code,
        spk.display_name,
        spk.description,
        JSON.stringify(vc)
      );
      result.push({
        id,
        project_id: projectId,
        speaker_code: spk.speaker_code,
        display_name: spk.display_name,
        description: spk.description,
        voice_characteristics: vc,
      });
    }
    return result;
  }

  static getSpeakersByProject(projectId: string): Speaker[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM speakers WHERE project_id = ? ORDER BY speaker_code ASC")
      .all(projectId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      project_id: String(r.project_id),
      speaker_code: String(r.speaker_code),
      display_name: String(r.display_name),
      description: String(r.description || ""),
      voice_characteristics: safeJsonParse(r.voice_characteristics, {}),
    }));
  }

  static saveTranscript(params: {
    project_id: string;
    audio_asset_id: string;
    language: string;
    full_text: string;
    story_analysis: StoryAnalysis;
    is_mock: boolean;
    segments: Array<{
      speaker_id: string | null;
      start_time: number;
      end_time: number;
      text: string;
      confidence: number;
      emotion: TranscriptSegment["emotion"];
      sequence_index: number;
      words?: TranscriptSegment["words"];
    }>;
  }): Transcript {
    const db = getDb();
    const existing = db
      .prepare(
        "SELECT MAX(version) as max_v FROM transcripts WHERE project_id = ?"
      )
      .get(params.project_id) as { max_v: number | null } | undefined;
    const version = (existing?.max_v || 0) + 1;
    const transcriptId = crypto.randomUUID();
    const now = nowIso();

    db.prepare(
      `INSERT INTO transcripts (
        id, project_id, audio_asset_id, language, full_text,
        story_analysis_json, is_mock, version, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)`
    ).run(
      transcriptId,
      params.project_id,
      params.audio_asset_id,
      params.language,
      params.full_text,
      JSON.stringify(params.story_analysis),
      params.is_mock ? 1 : 0,
      version,
      now
    );

    params.segments.forEach((seg, idx) => {
      db.prepare(
        `INSERT INTO transcript_segments (
          id, transcript_id, speaker_id, start_time, end_time,
          text, confidence, emotion, sequence_index, words_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        crypto.randomUUID(),
        transcriptId,
        seg.speaker_id,
        seg.start_time,
        seg.end_time,
        seg.text,
        seg.confidence,
        seg.emotion,
        seg.sequence_index ?? idx + 1,
        JSON.stringify(seg.words || [])
      );
    });

    return this.getTranscriptByProject(params.project_id)!;
  }

  static getTranscriptByProject(projectId: string): Transcript | null {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT * FROM transcripts WHERE project_id = ? ORDER BY version DESC LIMIT 1"
      )
      .get(projectId) as Record<string, unknown> | undefined;
    if (!row) return null;

    const transcriptId = String(row.id);
    const speakers = this.getSpeakersByProject(projectId);
    const speakerMap = new Map(speakers.map((s) => [s.id, s.display_name]));

    const segRows = db
      .prepare(
        "SELECT * FROM transcript_segments WHERE transcript_id = ? ORDER BY sequence_index ASC"
      )
      .all(transcriptId) as Record<string, unknown>[];

    const segments: TranscriptSegment[] = segRows.map((s) => {
      const spkId = s.speaker_id ? String(s.speaker_id) : null;
      return {
        id: String(s.id),
        transcript_id: transcriptId,
        speaker_id: spkId,
        speaker_name: spkId ? speakerMap.get(spkId) || "Người nói" : "Người kể",
        start_time: Number(s.start_time),
        end_time: Number(s.end_time),
        text: String(s.text),
        confidence: Number(s.confidence),
        emotion: (s.emotion as TranscriptSegment["emotion"]) || "neutral",
        sequence_index: Number(s.sequence_index),
        words: safeJsonParse(s.words_json, []),
      };
    });

    const defaultAnalysis: StoryAnalysis = {
      summary: "",
      main_topic: "",
      story_structure: { setup: "", conflict: "", resolution: "" },
      explicit_facts: [],
      contextual_inferences: [],
      visual_metaphors: [],
      emotional_arc: [],
      narrative_segments: [],
    };

    return {
      id: transcriptId,
      project_id: String(row.project_id),
      audio_asset_id: String(row.audio_asset_id),
      language: String(row.language),
      full_text: String(row.full_text),
      story_analysis: safeJsonParse(row.story_analysis_json, defaultAnalysis),
      is_mock: Boolean(row.is_mock),
      version: Number(row.version),
      status: String(row.status),
      created_at: String(row.created_at),
      segments,
    };
  }

  static updateTranscriptSegments(
    projectId: string,
    segmentUpdates: Array<{
      id: string;
      text?: string;
      speaker_id?: string | null;
      emotion?: TranscriptSegment["emotion"];
      start_time?: number;
      end_time?: number;
    }>
  ): Transcript | null {
    const transcript = this.getTranscriptByProject(projectId);
    if (!transcript) return null;
    const db = getDb();

    for (const upd of segmentUpdates) {
      const current = transcript.segments.find((s) => s.id === upd.id);
      if (!current) continue;
      db.prepare(
        `UPDATE transcript_segments
         SET text = ?, speaker_id = ?, emotion = ?, start_time = ?, end_time = ?
         WHERE id = ?`
      ).run(
        upd.text !== undefined ? upd.text : current.text,
        upd.speaker_id !== undefined ? upd.speaker_id : current.speaker_id,
        upd.emotion !== undefined ? upd.emotion : current.emotion,
        upd.start_time !== undefined ? upd.start_time : current.start_time,
        upd.end_time !== undefined ? upd.end_time : current.end_time,
        upd.id
      );
    }

    const updatedSegments = db
      .prepare(
        "SELECT text FROM transcript_segments WHERE transcript_id = ? ORDER BY sequence_index ASC"
      )
      .all(transcript.id) as Array<{ text: string }>;
    const fullText = updatedSegments.map((s) => s.text).join(" ");
    db.prepare("UPDATE transcripts SET full_text = ? WHERE id = ?").run(
      fullText,
      transcript.id
    );

    return this.getTranscriptByProject(projectId);
  }

  // --------------------------------------------------------------------------
  // 5. Characters & Character Consistency
  // --------------------------------------------------------------------------
  private static mapCharacter(row: Record<string, unknown>): CharacterProfile {
    const role =
      (row.role as CharacterProfile["role"]) || "protagonist";
    return {
      id: String(row.id),
      project_id: String(row.project_id),
      name: String(row.name),
      role,
      design_description: String(row.design_description || ""),
      color_palette: safeJsonParse(
        row.color_palette,
        DEFAULT_CHARACTER_PALETTES[role] || DEFAULT_CHARACTER_PALETTES.protagonist
      ),
      proportions: safeJsonParse(row.proportions_json, {
        head_ratio: 1.15,
        body_ratio: 1.0,
        limb_slenderness: 0.9,
        height_scale: 1.0,
      }),
      expressions: safeJsonParse(row.expressions_json, ALL_EXPRESSIONS),
      poses: safeJsonParse(row.poses_json, ["front", "three_quarter", "side", "seated"]),
      actions: safeJsonParse(row.actions_json, ALL_ACTIONS),
      layers: safeJsonParse(row.layers_json, {
        head: { shape: "round", scale: 1.0 },
        body: { torsoType: "minimal", width: 48, height: 80 },
        left_arm: { length: 58, thickness: 12 },
        right_arm: { length: 58, thickness: 12 },
        left_leg: { length: 68, thickness: 12 },
        right_leg: { length: 68, thickness: 12 },
        eyes: { style: "dot", color: "#1E1E24" },
        mouth: { style: "line", color: "#1E1E24" },
      }),
      reference_asset_id: row.reference_asset_id
        ? String(row.reference_asset_id)
        : null,
      locked: Boolean(row.locked),
      created_at: String(row.created_at),
    };
  }

  static getCharactersByProject(projectId: string): CharacterProfile[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM characters WHERE project_id = ? ORDER BY created_at ASC")
      .all(projectId) as Record<string, unknown>[];
    return rows.map((r) => this.mapCharacter(r));
  }

  static getCharacterById(characterId: string): CharacterProfile | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM characters WHERE id = ?")
      .get(characterId) as Record<string, unknown> | undefined;
    return row ? this.mapCharacter(row) : null;
  }

  static createCharacter(params: {
    project_id: string;
    name: string;
    role?: CharacterProfile["role"];
    design_description?: string;
    color_palette?: CharacterProfile["color_palette"];
    proportions?: CharacterProfile["proportions"];
    layers?: CharacterProfile["layers"];
    locked?: boolean;
  }): CharacterProfile {
    const db = getDb();
    const id = crypto.randomUUID();
    const role = params.role || "protagonist";
    const palette =
      params.color_palette ||
      DEFAULT_CHARACTER_PALETTES[role] ||
      DEFAULT_CHARACTER_PALETTES.protagonist;
    const proportions = params.proportions || {
      head_ratio: 1.15,
      body_ratio: 1.0,
      limb_slenderness: 0.9,
      height_scale: 1.0,
    };
    const layers: CharacterProfile["layers"] = params.layers || {
      head: { shape: "round", scale: 1.0 },
      body: { torsoType: "minimal", width: 48, height: 80 },
      left_arm: { length: 58, thickness: 12 },
      right_arm: { length: 58, thickness: 12 },
      left_leg: { length: 68, thickness: 12 },
      right_leg: { length: 68, thickness: 12 },
      eyes: { style: "dot", color: palette.shadow },
      mouth: { style: "line", color: palette.shadow },
    };

    db.prepare(
      `INSERT INTO characters (
        id, project_id, name, role, design_description, color_palette,
        proportions_json, expressions_json, poses_json, actions_json,
        layers_json, locked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.project_id,
      params.name,
      role,
      params.design_description ||
        "Dark Minimalist 2D figure with rounded head, clean silhouette, and articulated limbs.",
      JSON.stringify(palette),
      JSON.stringify(proportions),
      JSON.stringify(ALL_EXPRESSIONS),
      JSON.stringify(["front", "three_quarter", "side", "seated"]),
      JSON.stringify(ALL_ACTIONS),
      JSON.stringify(layers),
      params.locked ? 1 : 0,
      nowIso()
    );

    return this.getCharacterById(id)!;
  }

  static updateCharacter(
    characterId: string,
    updates: Partial<
      Pick<
        CharacterProfile,
        | "name"
        | "role"
        | "design_description"
        | "color_palette"
        | "proportions"
        | "layers"
        | "reference_asset_id"
        | "locked"
      >
    >
  ): CharacterProfile | null {
    const existing = this.getCharacterById(characterId);
    if (!existing) return null;

    // Enforce Character Lock rule: if character is already locked and user isn't unlocking or setting reference_asset_id, block design mutations
    if (
      existing.locked &&
      updates.locked !== false &&
      (updates.color_palette || updates.proportions || updates.layers)
    ) {
      throw new Error(
        "CHARACTER_LOCKED: Thiết kế nhân vật đã được khóa. Hãy mở khóa trước khi thay đổi hình dáng hoặc bảng màu."
      );
    }

    const db = getDb();
    db.prepare(
      `UPDATE characters SET
        name = ?,
        role = ?,
        design_description = ?,
        color_palette = ?,
        proportions_json = ?,
        layers_json = ?,
        reference_asset_id = ?,
        locked = ?
       WHERE id = ?`
    ).run(
      updates.name ?? existing.name,
      updates.role ?? existing.role,
      updates.design_description ?? existing.design_description,
      JSON.stringify(updates.color_palette ?? existing.color_palette),
      JSON.stringify(updates.proportions ?? existing.proportions),
      JSON.stringify(updates.layers ?? existing.layers),
      updates.reference_asset_id !== undefined
        ? updates.reference_asset_id
        : existing.reference_asset_id,
      updates.locked !== undefined
        ? updates.locked
          ? 1
          : 0
        : existing.locked
        ? 1
        : 0,
      characterId
    );

    return this.getCharacterById(characterId);
  }

  // --------------------------------------------------------------------------
  // 6. Assets & Versioning (Never overwrite old assets on regenerate)
  // --------------------------------------------------------------------------
  private static mapAsset(row: Record<string, unknown>): AssetRecord {
    return {
      id: String(row.id),
      project_id: String(row.project_id),
      scene_id: row.scene_id ? String(row.scene_id) : null,
      asset_type: row.asset_type as AssetRecord["asset_type"],
      storage_key: String(row.storage_key),
      provider: String(row.provider),
      model: String(row.model),
      prompt: String(row.prompt || ""),
      width: Number(row.width || 1920),
      height: Number(row.height || 1080),
      duration: Number(row.duration || 0),
      metadata: safeJsonParse(row.metadata, {}),
      is_mock: Boolean(row.is_mock),
      version: Number(row.version || 1),
      status: (row.status as AssetRecord["status"]) || "COMPLETED",
      created_at: String(row.created_at),
    };
  }

  static createAsset(params: {
    project_id: string;
    scene_id?: string | null;
    asset_type: AssetRecord["asset_type"];
    storage_key: string;
    provider: string;
    model: string;
    prompt?: string;
    width?: number;
    height?: number;
    duration?: number;
    metadata?: Record<string, unknown>;
    is_mock?: boolean;
    status?: AssetRecord["status"];
  }): AssetRecord {
    const db = getDb();
    let nextVersion = 1;
    if (params.scene_id) {
      const prev = db
        .prepare(
          "SELECT MAX(version) as max_v FROM assets WHERE scene_id = ? AND asset_type = ?"
        )
        .get(params.scene_id, params.asset_type) as
        | { max_v: number | null }
        | undefined;
      nextVersion = (prev?.max_v || 0) + 1;
    } else {
      const prev = db
        .prepare(
          "SELECT MAX(version) as max_v FROM assets WHERE project_id = ? AND asset_type = ?"
        )
        .get(params.project_id, params.asset_type) as
        | { max_v: number | null }
        | undefined;
      nextVersion = (prev?.max_v || 0) + 1;
    }

    const id = crypto.randomUUID();
    const now = nowIso();
    db.prepare(
      `INSERT INTO assets (
        id, project_id, scene_id, asset_type, storage_key, provider, model,
        prompt, width, height, duration, metadata, is_mock, version, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.project_id,
      params.scene_id || null,
      params.asset_type,
      params.storage_key,
      params.provider,
      params.model,
      params.prompt || "",
      params.width || 1920,
      params.height || 1080,
      params.duration || 0,
      JSON.stringify(params.metadata || {}),
      params.is_mock ? 1 : 0,
      nextVersion,
      params.status || "COMPLETED",
      now
    );

    if (params.scene_id && params.asset_type === "scene_image") {
      db.prepare(
        `INSERT INTO scene_assets (id, scene_id, asset_id, asset_role, version)
         VALUES (?, ?, ?, 'primary_visual', ?)`
      ).run(crypto.randomUUID(), params.scene_id, id, nextVersion);
    }

    return this.getAssetById(id)!;
  }

  static getAssetById(assetId: string): AssetRecord | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM assets WHERE id = ?")
      .get(assetId) as Record<string, unknown> | undefined;
    return row ? this.mapAsset(row) : null;
  }

  static getAssetsByProject(projectId: string): AssetRecord[] {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT * FROM assets WHERE project_id = ? ORDER BY created_at DESC, version DESC"
      )
      .all(projectId) as Record<string, unknown>[];
    return rows.map((r) => this.mapAsset(r));
  }

  // --------------------------------------------------------------------------
  // 7. Scenes, Scene Characters & Animation Clips
  // --------------------------------------------------------------------------
  private static mapScene(row: Record<string, unknown>): SceneRecord {
    const db = getDb();
    const sceneId = String(row.id);

    const charRows = db
      .prepare(
        `SELECT sc.*, c.name as character_name
         FROM scene_characters sc
         LEFT JOIN characters c ON c.id = sc.character_id
         WHERE sc.scene_id = ?
         ORDER BY sc.layer_order ASC`
      )
      .all(sceneId) as Record<string, unknown>[];

    const characters: SceneCharacterPlacement[] = charRows.map((cr) => ({
      id: String(cr.id),
      scene_id: sceneId,
      character_id: String(cr.character_id),
      character_name: cr.character_name ? String(cr.character_name) : undefined,
      action: (cr.action as SceneCharacterPlacement["action"]) || "idle",
      expression:
        (cr.expression as SceneCharacterPlacement["expression"]) || "neutral",
      position:
        (cr.position as SceneCharacterPlacement["position"]) || "center",
      layer_order: Number(cr.layer_order || 1),
    }));

    const latestSceneAsset = db
      .prepare(
        `SELECT a.* FROM assets a
         WHERE a.scene_id = ? AND a.asset_type = 'scene_image'
         ORDER BY a.version DESC, a.created_at DESC LIMIT 1`
      )
      .get(sceneId) as Record<string, unknown> | undefined;

    const latestAnimRow = db
      .prepare(
        `SELECT * FROM animation_clips WHERE scene_id = ? ORDER BY rowid DESC LIMIT 1`
      )
      .get(sceneId) as Record<string, unknown> | undefined;

    const animation_clip: AnimationClipRecord | null = latestAnimRow
      ? {
          id: String(latestAnimRow.id),
          scene_id: sceneId,
          method: latestAnimRow.method as AnimationMethod,
          animation_config: safeJsonParse(latestAnimRow.animation_config, {
            actions: [],
            camera: { shot: "medium", movement: "slow_push_in" },
            lip_sync_enabled: true,
          }),
          asset_id: latestAnimRow.asset_id
            ? String(latestAnimRow.asset_id)
            : null,
          start_time: Number(latestAnimRow.start_time),
          end_time: Number(latestAnimRow.end_time),
          status:
            (latestAnimRow.status as AnimationClipRecord["status"]) ||
            "COMPLETED",
        }
      : null;

    return {
      id: sceneId,
      project_id: String(row.project_id),
      sequence_index: Number(row.sequence_index),
      title: String(row.title),
      start_time: Number(row.start_time),
      end_time: Number(row.end_time),
      transcript_text: String(row.transcript_text),
      narrative_purpose: String(row.narrative_purpose || ""),
      emotion: safeJsonParse(row.emotion, {
        primary: "neutral",
        intensity: 0.5,
      }),
      visual_description: String(row.visual_description || ""),
      camera_direction: safeJsonParse(row.camera_direction, {
        shot: "medium",
        movement: "slow_push_in",
      }),
      animation_method: (row.animation_method as AnimationMethod) || "RIG_2D",
      animation_reason: String(row.animation_reason || ""),
      background: safeJsonParse(row.background_json, {
        asset_id: "bg_living_room",
        description: "Dark minimalist room",
      }),
      props: safeJsonParse(row.props_json, []),
      transition: safeJsonParse(row.transition_json, {
        type: "fade",
        duration: 0.4,
      }),
      image_prompt: String(row.image_prompt || ""),
      motion_prompt: String(row.motion_prompt || ""),
      negative_prompt: String(row.negative_prompt || ""),
      quality_issues: safeJsonParse(row.quality_issues_json, []),
      is_mock: Boolean(row.is_mock),
      status: (row.status as SceneStatus) || "PENDING",
      version: Number(row.version || 1),
      characters,
      primary_asset: latestSceneAsset ? this.mapAsset(latestSceneAsset) : null,
      animation_clip,
    };
  }

  static getScenesByProject(projectId: string): SceneRecord[] {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT * FROM scenes WHERE project_id = ? ORDER BY sequence_index ASC"
      )
      .all(projectId) as Record<string, unknown>[];
    return rows.map((r) => this.mapScene(r));
  }

  static getSceneById(sceneId: string): SceneRecord | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM scenes WHERE id = ?")
      .get(sceneId) as Record<string, unknown> | undefined;
    return row ? this.mapScene(row) : null;
  }

  static saveScenesForProject(
    projectId: string,
    scenesInput: Array<{
      sequence_index: number;
      title: string;
      start_time: number;
      end_time: number;
      transcript_text: string;
      narrative_purpose: string;
      emotion: SceneRecord["emotion"];
      visual_description: string;
      camera_direction: SceneRecord["camera_direction"];
      animation_method: AnimationMethod;
      animation_reason: string;
      background: SceneRecord["background"];
      props: SceneRecord["props"];
      transition: SceneRecord["transition"];
      image_prompt: string;
      motion_prompt: string;
      negative_prompt: string;
      is_mock: boolean;
      status?: SceneStatus;
      characters: SceneCharacterPlacement[];
    }>
  ): SceneRecord[] {
    const db = getDb();
    db.prepare("DELETE FROM scenes WHERE project_id = ?").run(projectId);

    for (const sc of scenesInput) {
      const sceneId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO scenes (
          id, project_id, sequence_index, title, start_time, end_time,
          transcript_text, narrative_purpose, emotion, visual_description,
          camera_direction, animation_method, animation_reason,
          background_json, props_json, transition_json,
          image_prompt, motion_prompt, negative_prompt,
          is_mock, status, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(
        sceneId,
        projectId,
        sc.sequence_index,
        sc.title,
        sc.start_time,
        sc.end_time,
        sc.transcript_text,
        sc.narrative_purpose,
        JSON.stringify(sc.emotion),
        sc.visual_description,
        JSON.stringify(sc.camera_direction),
        sc.animation_method,
        sc.animation_reason,
        JSON.stringify(sc.background),
        JSON.stringify(sc.props),
        JSON.stringify(sc.transition),
        sc.image_prompt,
        sc.motion_prompt,
        sc.negative_prompt,
        sc.is_mock ? 1 : 0,
        sc.status || "PENDING"
      );

      sc.characters.forEach((ch, idx) => {
        db.prepare(
          `INSERT INTO scene_characters (
            id, scene_id, character_id, action, expression, position, layer_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          crypto.randomUUID(),
          sceneId,
          ch.character_id,
          ch.action,
          ch.expression,
          ch.position,
          ch.layer_order ?? idx + 1
        );
      });
    }

    this.rebuildTimelineClips(projectId);
    return this.getScenesByProject(projectId);
  }

  static updateScene(
    sceneId: string,
    updates: Partial<{
      title: string;
      start_time: number;
      end_time: number;
      transcript_text: string;
      narrative_purpose: string;
      emotion: SceneRecord["emotion"];
      visual_description: string;
      camera_direction: SceneRecord["camera_direction"];
      animation_method: AnimationMethod;
      animation_reason: string;
      background: SceneRecord["background"];
      props: SceneRecord["props"];
      transition: SceneRecord["transition"];
      image_prompt: string;
      motion_prompt: string;
      negative_prompt: string;
      quality_issues: string[];
      status: SceneStatus;
      characters: SceneCharacterPlacement[];
    }>
  ): SceneRecord | null {
    const existing = this.getSceneById(sceneId);
    if (!existing) return null;
    const db = getDb();

    const nextVersion = existing.version + 1;
    db.prepare(
      `UPDATE scenes SET
        title = ?,
        start_time = ?,
        end_time = ?,
        transcript_text = ?,
        narrative_purpose = ?,
        emotion = ?,
        visual_description = ?,
        camera_direction = ?,
        animation_method = ?,
        animation_reason = ?,
        background_json = ?,
        props_json = ?,
        transition_json = ?,
        image_prompt = ?,
        motion_prompt = ?,
        negative_prompt = ?,
        quality_issues_json = ?,
        status = ?,
        version = ?
       WHERE id = ?`
    ).run(
      updates.title ?? existing.title,
      updates.start_time ?? existing.start_time,
      updates.end_time ?? existing.end_time,
      updates.transcript_text ?? existing.transcript_text,
      updates.narrative_purpose ?? existing.narrative_purpose,
      JSON.stringify(updates.emotion ?? existing.emotion),
      updates.visual_description ?? existing.visual_description,
      JSON.stringify(updates.camera_direction ?? existing.camera_direction),
      updates.animation_method ?? existing.animation_method,
      updates.animation_reason ?? existing.animation_reason,
      JSON.stringify(updates.background ?? existing.background),
      JSON.stringify(updates.props ?? existing.props),
      JSON.stringify(updates.transition ?? existing.transition),
      updates.image_prompt ?? existing.image_prompt,
      updates.motion_prompt ?? existing.motion_prompt,
      updates.negative_prompt ?? existing.negative_prompt,
      JSON.stringify(updates.quality_issues ?? existing.quality_issues),
      updates.status ?? existing.status,
      nextVersion,
      sceneId
    );

    if (updates.characters) {
      db.prepare("DELETE FROM scene_characters WHERE scene_id = ?").run(sceneId);
      updates.characters.forEach((ch, idx) => {
        db.prepare(
          `INSERT INTO scene_characters (
            id, scene_id, character_id, action, expression, position, layer_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          crypto.randomUUID(),
          sceneId,
          ch.character_id,
          ch.action,
          ch.expression,
          ch.position,
          ch.layer_order ?? idx + 1
        );
      });
    }

    this.rebuildTimelineClips(existing.project_id);
    return this.getSceneById(sceneId);
  }

  static saveAnimationClip(params: {
    scene_id: string;
    method: AnimationMethod;
    animation_config: AnimationClipRecord["animation_config"];
    asset_id?: string | null;
    start_time: number;
    end_time: number;
    status?: AnimationClipRecord["status"];
  }): AnimationClipRecord {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO animation_clips (
        id, scene_id, method, animation_config, asset_id, start_time, end_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.scene_id,
      params.method,
      JSON.stringify(params.animation_config),
      params.asset_id || null,
      params.start_time,
      params.end_time,
      params.status || "COMPLETED"
    );

    return {
      id,
      scene_id: params.scene_id,
      method: params.method,
      animation_config: params.animation_config,
      asset_id: params.asset_id || null,
      start_time: params.start_time,
      end_time: params.end_time,
      status: params.status || "COMPLETED",
    };
  }

  // --------------------------------------------------------------------------
  // 8. Multi-Track Timeline Synchronization
  // --------------------------------------------------------------------------
  static rebuildTimelineClips(projectId: string): TimelineTrack[] {
    const db = getDb();
    const tracks = db
      .prepare(
        "SELECT * FROM timeline_tracks WHERE project_id = ? ORDER BY order_index ASC"
      )
      .all(projectId) as Record<string, unknown>[];
    if (tracks.length === 0) return [];

    for (const tr of tracks) {
      db.prepare("DELETE FROM timeline_clips WHERE track_id = ?").run(
        String(tr.id)
      );
    }

    const audio = this.getProjectAudio(projectId);
    const scenes = this.getScenesByProject(projectId);
    const duration =
      audio?.duration ||
      (scenes.length > 0 ? scenes[scenes.length - 1].end_time : 24);

    for (const tr of tracks) {
      const trackId = String(tr.id);
      const trackType = String(tr.track_type) as TimelineTrack["track_type"];

      if (trackType === "audio_master" && audio) {
        db.prepare(
          `INSERT INTO timeline_clips (id, track_id, scene_id, asset_id, start_time, end_time, offset, metadata)
           VALUES (?, ?, NULL, ?, 0, ?, 0, ?)`
        ).run(
          crypto.randomUUID(),
          trackId,
          audio.id,
          audio.duration,
          JSON.stringify({ label: audio.file_name })
        );
      } else if (trackType === "scene") {
        for (const sc of scenes) {
          db.prepare(
            `INSERT INTO timeline_clips (id, track_id, scene_id, asset_id, start_time, end_time, offset, metadata)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
          ).run(
            crypto.randomUUID(),
            trackId,
            sc.id,
            sc.primary_asset?.id || null,
            sc.start_time,
            sc.end_time,
            JSON.stringify({
              title: sc.title,
              status: sc.status,
              emotion: sc.emotion.primary,
            })
          );
        }
      } else if (trackType === "animation") {
        for (const sc of scenes) {
          db.prepare(
            `INSERT INTO timeline_clips (id, track_id, scene_id, asset_id, start_time, end_time, offset, metadata)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
          ).run(
            crypto.randomUUID(),
            trackId,
            sc.id,
            sc.animation_clip?.asset_id || null,
            sc.start_time,
            sc.end_time,
            JSON.stringify({
              method: sc.animation_method,
              camera: sc.camera_direction,
            })
          );
        }
      } else if (trackType === "subtitle") {
        for (const sc of scenes) {
          db.prepare(
            `INSERT INTO timeline_clips (id, track_id, scene_id, asset_id, start_time, end_time, offset, metadata)
             VALUES (?, ?, ?, NULL, ?, ?, 0, ?)`
          ).run(
            crypto.randomUUID(),
            trackId,
            sc.id,
            sc.start_time,
            sc.end_time,
            JSON.stringify({ text: sc.transcript_text })
          );
        }
      } else if (trackType === "music") {
        db.prepare(
          `INSERT INTO timeline_clips (id, track_id, scene_id, asset_id, start_time, end_time, offset, metadata)
           VALUES (?, ?, NULL, NULL, 0, ?, 0, ?)`
        ).run(
          crypto.randomUUID(),
          trackId,
          duration,
          JSON.stringify({ label: "Dark Ambient Piano Pad (-18dB Ducked)" })
        );
      } else if (trackType === "sfx") {
        for (const sc of scenes) {
          if (sc.props.length > 0 || sc.emotion.intensity >= 0.7) {
            db.prepare(
              `INSERT INTO timeline_clips (id, track_id, scene_id, asset_id, start_time, end_time, offset, metadata)
               VALUES (?, ?, ?, NULL, ?, ?, 0, ?)`
            ).run(
              crypto.randomUUID(),
              trackId,
              sc.id,
              sc.start_time,
              Math.min(sc.end_time, sc.start_time + 2.5),
              JSON.stringify({
                label:
                  sc.props[0]?.type === "rain"
                    ? "Rain Ambience"
                    : "Room Tone / Foley",
              })
            );
          }
        }
      }
    }

    return this.getTimelineByProject(projectId);
  }

  static getTimelineByProject(projectId: string): TimelineTrack[] {
    const db = getDb();
    const trackRows = db
      .prepare(
        "SELECT * FROM timeline_tracks WHERE project_id = ? ORDER BY order_index ASC"
      )
      .all(projectId) as Record<string, unknown>[];

    return trackRows.map((tr) => {
      const trackId = String(tr.id);
      const clipRows = db
        .prepare(
          "SELECT * FROM timeline_clips WHERE track_id = ? ORDER BY start_time ASC"
        )
        .all(trackId) as Record<string, unknown>[];
      const clips: TimelineClip[] = clipRows.map((c) => ({
        id: String(c.id),
        track_id: trackId,
        scene_id: c.scene_id ? String(c.scene_id) : null,
        asset_id: c.asset_id ? String(c.asset_id) : null,
        start_time: Number(c.start_time),
        end_time: Number(c.end_time),
        offset: Number(c.offset || 0),
        metadata: safeJsonParse(c.metadata, {}),
      }));

      return {
        id: trackId,
        project_id: String(tr.project_id),
        track_type: tr.track_type as TimelineTrack["track_type"],
        name: String(tr.name),
        order_index: Number(tr.order_index),
        muted: Boolean(tr.muted),
        volume: Number(tr.volume ?? 1.0),
        clips,
      };
    });
  }

  static updateTimelineTrack(
    trackId: string,
    updates: { muted?: boolean; volume?: number }
  ): void {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM timeline_tracks WHERE id = ?")
      .get(trackId) as Record<string, unknown> | undefined;
    if (!row) return;
    db.prepare(
      "UPDATE timeline_tracks SET muted = ?, volume = ? WHERE id = ?"
    ).run(
      updates.muted !== undefined
        ? updates.muted
          ? 1
          : 0
        : Number(row.muted),
      updates.volume !== undefined ? updates.volume : Number(row.volume),
      trackId
    );
  }

  // --------------------------------------------------------------------------
  // 9. Generation Jobs & Render Jobs
  // --------------------------------------------------------------------------
  private static mapJob(row: Record<string, unknown>): GenerationJob {
    return {
      id: String(row.id),
      project_id: String(row.project_id),
      scene_id: row.scene_id ? String(row.scene_id) : null,
      job_type: row.job_type as GenerationJob["job_type"],
      provider: String(row.provider),
      model: String(row.model),
      input_payload: safeJsonParse(row.input_payload, {}),
      output_payload: safeJsonParse(row.output_payload, {}),
      status: row.status as GenerationJob["status"],
      retry_count: Number(row.retry_count || 0),
      error_message: row.error_message ? String(row.error_message) : null,
      created_at: String(row.created_at),
      completed_at: row.completed_at ? String(row.completed_at) : null,
    };
  }

  static createJob(params: {
    project_id: string;
    scene_id?: string | null;
    job_type: GenerationJob["job_type"];
    provider: string;
    model: string;
    input_payload?: Record<string, unknown>;
  }): GenerationJob {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = nowIso();
    db.prepare(
      `INSERT INTO generation_jobs (
        id, project_id, scene_id, job_type, provider, model,
        input_payload, output_payload, status, retry_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 'RUNNING', 0, ?)`
    ).run(
      id,
      params.project_id,
      params.scene_id || null,
      params.job_type,
      params.provider,
      params.model,
      JSON.stringify(params.input_payload || {}),
      now
    );
    return this.getJobById(id)!;
  }

  static updateJob(
    jobId: string,
    updates: Partial<{
      status: GenerationJob["status"];
      output_payload: Record<string, unknown>;
      error_message: string | null;
      retry_count: number;
    }>
  ): GenerationJob | null {
    const existing = this.getJobById(jobId);
    if (!existing) return null;
    const db = getDb();
    const isTerminal =
      updates.status === "COMPLETED" ||
      updates.status === "FAILED" ||
      updates.status === "CANCELLED";
    db.prepare(
      `UPDATE generation_jobs SET
        status = ?,
        output_payload = ?,
        error_message = ?,
        retry_count = ?,
        completed_at = ?
       WHERE id = ?`
    ).run(
      updates.status ?? existing.status,
      JSON.stringify(updates.output_payload ?? existing.output_payload),
      updates.error_message !== undefined
        ? updates.error_message
        : existing.error_message,
      updates.retry_count ?? existing.retry_count,
      isTerminal ? nowIso() : existing.completed_at,
      jobId
    );
    return this.getJobById(jobId);
  }

  static getJobById(jobId: string): GenerationJob | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM generation_jobs WHERE id = ?")
      .get(jobId) as Record<string, unknown> | undefined;
    return row ? this.mapJob(row) : null;
  }

  static getJobsByProject(projectId: string): GenerationJob[] {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT * FROM generation_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 50"
      )
      .all(projectId) as Record<string, unknown>[];
    return rows.map((r) => this.mapJob(r));
  }

  static createRenderJob(
    projectId: string,
    qualityReport: QualityControlReport
  ): RenderJob {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = nowIso();
    db.prepare(
      `INSERT INTO render_jobs (
        id, project_id, status, progress, quality_report_json, created_at
      ) VALUES (?, ?, 'RUNNING', 5, ?, ?)`
    ).run(id, projectId, JSON.stringify(qualityReport), now);
    return this.getRenderJobById(id)!;
  }

  static updateRenderJob(
    renderJobId: string,
    updates: Partial<{
      status: RenderJob["status"];
      progress: number;
      output_asset_id: string | null;
      quality_report: QualityControlReport;
      error_message: string | null;
    }>
  ): RenderJob | null {
    const existing = this.getRenderJobById(renderJobId);
    if (!existing) return null;
    const db = getDb();
    const isDone =
      updates.status === "COMPLETED" ||
      updates.status === "FAILED" ||
      updates.status === "CANCELLED";
    db.prepare(
      `UPDATE render_jobs SET
        status = ?,
        progress = ?,
        output_asset_id = ?,
        quality_report_json = ?,
        error_message = ?,
        completed_at = ?
       WHERE id = ?`
    ).run(
      updates.status ?? existing.status,
      updates.progress ?? existing.progress,
      updates.output_asset_id !== undefined
        ? updates.output_asset_id
        : existing.output_asset_id,
      JSON.stringify(updates.quality_report ?? existing.quality_report),
      updates.error_message !== undefined
        ? updates.error_message
        : existing.error_message,
      isDone ? nowIso() : existing.completed_at,
      renderJobId
    );
    return this.getRenderJobById(renderJobId);
  }

  static getRenderJobById(renderJobId: string): RenderJob | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM render_jobs WHERE id = ?")
      .get(renderJobId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      project_id: String(row.project_id),
      status: row.status as RenderJob["status"],
      progress: Number(row.progress || 0),
      output_asset_id: row.output_asset_id
        ? String(row.output_asset_id)
        : null,
      quality_report: safeJsonParse(row.quality_report_json, {
        passed: true,
        checked_at: nowIso(),
        total_scenes: 0,
        approved_scenes: 0,
        needs_review_scenes: 0,
        audio_coverage_ratio: 1,
        issues: [],
      }),
      error_message: row.error_message ? String(row.error_message) : null,
      created_at: String(row.created_at),
      completed_at: row.completed_at ? String(row.completed_at) : null,
    };
  }

  static getLatestRenderJob(projectId: string): RenderJob | null {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT * FROM render_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1"
      )
      .get(projectId) as Record<string, unknown> | undefined;
    return row ? this.getRenderJobById(String(row.id)) : null;
  }

  // --------------------------------------------------------------------------
  // 10. Cost Control & Provider Config
  // --------------------------------------------------------------------------
  static recordCost(params: {
    project_id: string;
    scene_id?: string | null;
    provider: string;
    model: string;
    operation: string;
    usage?: Record<string, unknown>;
    estimated_cost_usd: number;
    actual_cost_usd?: number;
  }): CostRecord {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = nowIso();
    const actual = params.actual_cost_usd ?? params.estimated_cost_usd;
    db.prepare(
      `INSERT INTO cost_records (
        id, project_id, scene_id, provider, model, operation,
        usage_json, estimated_cost_usd, actual_cost_usd, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.project_id,
      params.scene_id || null,
      params.provider,
      params.model,
      params.operation,
      JSON.stringify(params.usage || {}),
      params.estimated_cost_usd,
      actual,
      now
    );
    return {
      id,
      project_id: params.project_id,
      scene_id: params.scene_id || null,
      provider: params.provider,
      model: params.model,
      operation: params.operation,
      usage: params.usage || {},
      estimated_cost_usd: params.estimated_cost_usd,
      actual_cost_usd: actual,
      created_at: now,
    };
  }

  static getProjectCosts(projectId: string): {
    total_estimated_usd: number;
    total_actual_usd: number;
    records: CostRecord[];
  } {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT * FROM cost_records WHERE project_id = ? ORDER BY created_at DESC"
      )
      .all(projectId) as Record<string, unknown>[];
    const records: CostRecord[] = rows.map((r) => ({
      id: String(r.id),
      project_id: String(r.project_id),
      scene_id: r.scene_id ? String(r.scene_id) : null,
      provider: String(r.provider),
      model: String(r.model),
      operation: String(r.operation),
      usage: safeJsonParse(r.usage_json, {}),
      estimated_cost_usd: Number(r.estimated_cost_usd || 0),
      actual_cost_usd: Number(r.actual_cost_usd || 0),
      created_at: String(r.created_at),
    }));
    const total_estimated_usd = Number(
      records.reduce((s, r) => s + r.estimated_cost_usd, 0).toFixed(4)
    );
    const total_actual_usd = Number(
      records.reduce((s, r) => s + r.actual_cost_usd, 0).toFixed(4)
    );
    return { total_estimated_usd, total_actual_usd, records };
  }

  static setProviderConfig(key: string, value: string): void {
    const db = getDb();
    db.prepare(
      `INSERT INTO provider_configs (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(key, value, nowIso());
  }

  static getProviderConfig(key: string): string | null {
    const db = getDb();
    const row = db
      .prepare("SELECT value FROM provider_configs WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  static getAllProviderConfigs(): Record<string, string> {
    const db = getDb();
    const rows = db
      .prepare("SELECT key, value FROM provider_configs")
      .all() as Array<{ key: string; value: string }>;
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return map;
  }
}
