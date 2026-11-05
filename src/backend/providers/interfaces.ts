// ============================================================================
// DARKTOON AI — Pluggable AI Provider Adapter Interfaces
// (src/backend/providers/interfaces.ts)
// ============================================================================

import type {
  AnimationMethod,
  BackgroundPresetId,
  CameraMovement,
  CameraShot,
  CharacterAction,
  CharacterExpression,
  CharacterProfile,
  SceneCharacterPlacement,
  SceneProp,
  StoryAnalysis,
  WordTimestamp,
} from "../../types/darktoon.ts";

export interface ASRResultSegment {
  start_time: number;
  end_time: number;
  text: string;
  confidence: number;
  emotion: CharacterExpression;
  words: WordTimestamp[];
}

export interface ASRTranscriptionResult {
  language: string;
  full_text: string;
  segments: ASRResultSegment[];
  provider: string;
  model: string;
  is_mock: boolean;
}

export interface DiarizationResult {
  speakers: Array<{
    speaker_code: string;
    display_name: string;
    description: string;
    voice_characteristics: Record<string, unknown>;
  }>;
  segment_speaker_codes: string[];
  provider: string;
  model: string;
  is_mock: boolean;
}

export interface PlannedSceneCandidate {
  sequence_index: number;
  title: string;
  start_time: number;
  end_time: number;
  transcript_text: string;
  narrative_purpose: string;
  emotion: { primary: CharacterExpression; intensity: number };
  visual_description: string;
  camera_direction: { shot: CameraShot; movement: CameraMovement };
  animation_method: AnimationMethod;
  animation_reason: string;
  background: { asset_id: BackgroundPresetId; description: string };
  props: SceneProp[];
  transition: { type: "cut" | "fade" | "dissolve" | "wipe"; duration: number };
  image_prompt: string;
  motion_prompt: string;
  negative_prompt: string;
  characters: SceneCharacterPlacement[];
}

export interface ASRProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  transcribe(params: {
    audioBuffer: Buffer;
    fileName: string;
    durationSec: number;
    languageHint?: string;
    customTranscriptHint?: string;
  }): Promise<ASRTranscriptionResult>;
  getWordTimestamps(text: string, start: number, end: number): WordTimestamp[];
  detectLanguage(text: string): string;
}

export interface DiarizationProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  diarize(params: {
    segments: ASRResultSegment[];
    durationSec: number;
  }): Promise<DiarizationResult>;
  mapSpeakers(
    segments: ASRResultSegment[],
    speakerIdsByCode: Record<string, string>,
    diarization: DiarizationResult
  ): Array<ASRResultSegment & { speaker_id: string | null }>;
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  analyzeStory(params: {
    transcriptText: string;
    segments: Array<{
      start_time: number;
      end_time: number;
      text: string;
      speaker_name?: string;
      emotion: CharacterExpression;
    }>;
    durationSec: number;
  }): Promise<{ analysis: StoryAnalysis; is_mock: boolean }>;
  generateStoryboard(params: {
    projectId: string;
    segments: Array<{
      start_time: number;
      end_time: number;
      text: string;
      speaker_name?: string;
      emotion: CharacterExpression;
    }>;
    storyAnalysis: StoryAnalysis;
    characters: CharacterProfile[];
    durationSec: number;
  }): Promise<{ scenes: PlannedSceneCandidate[]; is_mock: boolean }>;
  reviseScene(params: {
    scene: PlannedSceneCandidate;
    instruction: string;
  }): Promise<PlannedSceneCandidate>;
  validateScene(scene: PlannedSceneCandidate): {
    valid: boolean;
    issues: string[];
  };
}

export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  generateImage(params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    backgroundId: BackgroundPresetId;
    characters: Array<{
      profile: CharacterProfile;
      action: CharacterAction;
      expression: CharacterExpression;
      position: "left" | "center" | "right" | "foreground" | "background";
    }>;
    props: SceneProp[];
    subtitleText?: string;
  }): Promise<{
    data: Buffer | string;
    format: "svg" | "png";
    provider: string;
    model: string;
    is_mock: boolean;
  }>;
  generateCharacterReference(params: {
    character: CharacterProfile;
    width: number;
    height: number;
  }): Promise<{
    data: Buffer | string;
    format: "svg" | "png";
    provider: string;
    model: string;
    is_mock: boolean;
  }>;
}

export interface VideoProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  imageToVideo(params: {
    sceneImageKey: string;
    motionPrompt: string;
    negativePrompt: string;
    durationSec: number;
    cameraMovement: CameraMovement;
  }): Promise<{
    jobId: string;
    status: "COMPLETED" | "FAILED";
    provider: string;
    model: string;
    is_mock: boolean;
    fallbackToRig?: boolean;
    reason?: string;
  }>;
  getJobStatus(jobId: string): Promise<"PENDING" | "COMPLETED" | "FAILED">;
}
