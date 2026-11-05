// ============================================================================
// DARKTOON AI — AI Pipeline Orchestrator Service
// (src/backend/services/pipelineOrchestratorService.ts)
// ============================================================================

import { DarktoonRepository } from "../repositories/darktoonRepository.ts";
import { ProviderRegistry } from "../providers/providerRegistry.ts";
import { AnimationRouterService } from "./animationRouterService.ts";
import { StorageService } from "../storage/storageService.ts";
import type {
  AnimationClipRecord,
  AnimationMethod,
  AssetRecord,
  CharacterProfile,
  GenerationJob,
  SceneRecord,
  Speaker,
  Transcript,
} from "../../types/darktoon.ts";

export class PipelineOrchestratorService {
  /**
   * Phase 2 Pipeline: Audio Preprocessing -> ASR Transcription -> Speaker Diarization -> Story Analysis
   */
  static async analyzeProjectAudio(params: {
    projectId: string;
    providerOverride?: "openai" | "gemini" | "mock";
    customTranscriptHint?: string;
  }): Promise<{
    transcript: Transcript;
    speakers: Speaker[];
    job: GenerationJob;
  }> {
    const project = DarktoonRepository.getProject(params.projectId);
    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    let audio = DarktoonRepository.getProjectAudio(params.projectId);
    if (!audio) {
      // Create default synthesized conversation WAV if project has no audio yet
      const wavBuf = StorageService.generateSynthesizedConversationWav(24);
      const storageKey = StorageService.buildStorageKey(
        params.projectId,
        "audio",
        "dialogue_sample.wav"
      );
      StorageService.saveObject(storageKey, wavBuf);
      const waveform = StorageService.extractWaveformPeaks(wavBuf, 96);
      audio = DarktoonRepository.createAudioAsset({
        project_id: params.projectId,
        file_name: "dialogue_sample.wav",
        storage_key: storageKey,
        format: "wav",
        duration: 24,
        sample_rate: 22050,
        channels: 1,
        file_size: wavBuf.length,
        waveform,
      });
    }

    const asrProvider = ProviderRegistry.getASR(params.providerOverride);
    const diarProvider = ProviderRegistry.getDiarization(
      params.providerOverride
    );
    const llmProvider = ProviderRegistry.getLLM(params.providerOverride);

    const job = DarktoonRepository.createJob({
      project_id: params.projectId,
      job_type: "ASR_TRANSCRIBE",
      provider: asrProvider.name,
      model: asrProvider.model,
      input_payload: {
        audio_asset_id: audio.id,
        duration: audio.duration,
        language: project.language,
      },
    });

    try {
      DarktoonRepository.updateProject(params.projectId, {
        status: "TRANSCRIBING",
      });

      const audioBuffer = StorageService.exists(audio.storage_key)
        ? StorageService.readObject(audio.storage_key)
        : StorageService.generateSynthesizedConversationWav(audio.duration);

      const asrResult = await asrProvider.transcribe({
        audioBuffer,
        fileName: audio.file_name,
        durationSec: audio.duration,
        languageHint: project.language,
        customTranscriptHint: params.customTranscriptHint,
      });

      DarktoonRepository.updateProject(params.projectId, {
        status: "DIARIZING",
      });

      const diarResult = await diarProvider.diarize({
        segments: asrResult.segments,
        durationSec: audio.duration,
      });

      const savedSpeakers = DarktoonRepository.saveSpeakers(
        params.projectId,
        diarResult.speakers
      );
      const speakerIdsByCode: Record<string, string> = {};
      for (const spk of savedSpeakers) {
        speakerIdsByCode[spk.speaker_code] = spk.id;
      }

      const mappedSegments = diarProvider.mapSpeakers(
        asrResult.segments,
        speakerIdsByCode,
        diarResult
      );

      DarktoonRepository.updateProject(params.projectId, {
        status: "ANALYZING",
      });

      const speakerNameById = new Map(
        savedSpeakers.map((s) => [s.id, s.display_name])
      );

      const { analysis, is_mock: llmMock } = await llmProvider.analyzeStory({
        transcriptText: asrResult.full_text,
        segments: mappedSegments.map((s) => ({
          start_time: s.start_time,
          end_time: s.end_time,
          text: s.text,
          speaker_name: s.speaker_id
            ? speakerNameById.get(s.speaker_id)
            : "Người kể",
          emotion: s.emotion,
        })),
        durationSec: audio.duration,
      });

      const transcript = DarktoonRepository.saveTranscript({
        project_id: params.projectId,
        audio_asset_id: audio.id,
        language: asrResult.language,
        full_text: asrResult.full_text,
        story_analysis: analysis,
        is_mock: asrResult.is_mock || llmMock,
        segments: mappedSegments.map((seg, i) => ({
          speaker_id: seg.speaker_id,
          start_time: seg.start_time,
          end_time: seg.end_time,
          text: seg.text,
          confidence: seg.confidence,
          emotion: seg.emotion,
          sequence_index: i + 1,
          words: seg.words,
        })),
      });

      // Record cost tracking
      const estCost =
        asrResult.is_mock
          ? 0
          : Number(((audio.duration / 60) * 0.006 + 0.015).toFixed(4));
      DarktoonRepository.recordCost({
        project_id: params.projectId,
        provider: asrProvider.name,
        model: `${asrProvider.model}+${llmProvider.model}`,
        operation: "AUDIO_ANALYSIS_AND_DIARIZATION",
        usage: {
          audio_seconds: audio.duration,
          segments: transcript.segments.length,
          is_mock: transcript.is_mock,
        },
        estimated_cost_usd: estCost,
      });

      const completedJob = DarktoonRepository.updateJob(job.id, {
        status: "COMPLETED",
        output_payload: {
          transcript_id: transcript.id,
          speakers_count: savedSpeakers.length,
          segments_count: transcript.segments.length,
          is_mock: transcript.is_mock,
        },
      })!;

      return { transcript, speakers: savedSpeakers, job: completedJob };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      DarktoonRepository.updateJob(job.id, {
        status: "FAILED",
        error_message: msg,
      });
      DarktoonRepository.updateProject(params.projectId, { status: "FAILED" });
      throw err;
    }
  }

  /**
   * Phase 3-5 Pipeline: Character Consistency -> Storyboard Scene Planning ->
   * Scene Image Layer Composition -> Hybrid 2D Rig / AI Video Animation -> Timeline Sync
   */
  static async generateProjectStoryboard(params: {
    projectId: string;
    providerOverride?: "openai" | "gemini" | "mock";
  }): Promise<{
    scenes: SceneRecord[];
    characters: CharacterProfile[];
    job: GenerationJob;
  }> {
    const project = DarktoonRepository.getProject(params.projectId);
    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    let transcript = DarktoonRepository.getTranscriptByProject(params.projectId);
    if (!transcript) {
      const analyzed = await this.analyzeProjectAudio({
        projectId: params.projectId,
        providerOverride: params.providerOverride,
      });
      transcript = analyzed.transcript;
    }

    const llmProvider = ProviderRegistry.getLLM(params.providerOverride);
    const imageProvider = ProviderRegistry.getImage(params.providerOverride);

    const job = DarktoonRepository.createJob({
      project_id: params.projectId,
      job_type: "STORYBOARD_GENERATE",
      provider: llmProvider.name,
      model: llmProvider.model,
      input_payload: {
        transcript_id: transcript.id,
        segments_count: transcript.segments.length,
      },
    });

    try {
      // Step 5: Reuse existing Character Library profiles or create consistent characters
      DarktoonRepository.updateProject(params.projectId, {
        status: "GENERATING_CHARACTERS",
      });

      let characters = DarktoonRepository.getCharactersByProject(
        params.projectId
      );
      if (characters.length === 0) {
        const mainChar = DarktoonRepository.createCharacter({
          project_id: params.projectId,
          name: "Nhân vật Tôi (Main Character)",
          role: "protagonist",
          design_description:
            "Nhân vật chính phong cách Dark Minimalist 2D: đầu tròn trắng ngà (#F4F1EA), đường nét bo tròn tối giản, khớp xương 8 bộ phận điều khiển độc lập.",
          locked: true,
        });
        const friendChar = DarktoonRepository.createCharacter({
          project_id: params.projectId,
          name: "Người bạn (Confidant)",
          role: "deuteragonist",
          design_description:
            "Nhân vật đồng hành tông xám sáng (#CBD5E1), đường nét tối giản đồng bộ tỷ lệ với nhân vật chính.",
          locked: true,
        });
        const shadowChar = DarktoonRepository.createCharacter({
          project_id: params.projectId,
          name: "Bóng tối nội tâm (Inner Shadow)",
          role: "shadow",
          design_description:
            "Hình bóng biểu tượng tâm lý màu đen tuyền (#09090C) với đường viền sáng đỏ (#F04444).",
          locked: true,
        });
        characters = [mainChar, friendChar, shadowChar];

        // Generate character reference sheets
        for (const ch of characters) {
          const refImg = await imageProvider.generateCharacterReference({
            character: ch,
            width: 1280,
            height: 720,
          });
          const key = StorageService.buildStorageKey(
            params.projectId,
            "characters",
            `${ch.id}_ref.svg`
          );
          StorageService.saveObject(key, refImg.data);
          const asset = DarktoonRepository.createAsset({
            project_id: params.projectId,
            asset_type: "character_reference",
            storage_key: key,
            provider: refImg.provider,
            model: refImg.model,
            prompt: `Character Reference Sheet for ${ch.name}`,
            width: 1280,
            height: 720,
            is_mock: refImg.is_mock,
          });
          // Temporarily unlock to bind reference_asset_id then re-lock
          DarktoonRepository.updateCharacter(ch.id, {
            locked: false,
            reference_asset_id: asset.id,
          });
          DarktoonRepository.updateCharacter(ch.id, { locked: true });
        }
        characters = DarktoonRepository.getCharactersByProject(
          params.projectId
        );
      }

      // Step 4: Generate Storyboard Scenes from Transcript
      DarktoonRepository.updateProject(params.projectId, {
        status: "GENERATING_STORYBOARD",
      });

      const audio = DarktoonRepository.getProjectAudio(params.projectId);
      const { scenes: plannedScenes, is_mock } =
        await llmProvider.generateStoryboard({
          projectId: params.projectId,
          segments: transcript.segments,
          storyAnalysis: transcript.story_analysis,
          characters,
          durationSec: audio?.duration || 24,
        });

      const savedScenes = DarktoonRepository.saveScenesForProject(
        params.projectId,
        plannedScenes.map((sc) => ({
          ...sc,
          is_mock,
          status: "GENERATING",
        }))
      );

      // Step 6 & 7: Generate Scene Visuals & Hybrid Animation Clips
      DarktoonRepository.updateProject(params.projectId, {
        status: "GENERATING_IMAGES",
      });

      const charMap = new Map(characters.map((c) => [c.id, c]));

      for (const sc of savedScenes) {
        const sceneCharsWithProfiles = sc.characters
          .map((placement) => {
            const prof = charMap.get(placement.character_id) || characters[0];
            return {
              profile: prof,
              action: placement.action,
              expression: placement.expression,
              position: placement.position,
            };
          })
          .filter((x) => Boolean(x.profile));

        const imgRes = await imageProvider.generateImage({
          prompt: sc.image_prompt,
          negativePrompt: sc.negative_prompt,
          width: project.aspect_ratio === "9:16" ? 1080 : 1920,
          height: project.aspect_ratio === "9:16" ? 1920 : 1080,
          backgroundId: sc.background.asset_id,
          characters: sceneCharsWithProfiles,
          props: sc.props,
          subtitleText: sc.transcript_text,
        });

        const storageKey = StorageService.buildStorageKey(
          params.projectId,
          "images",
          `scene_${String(sc.sequence_index).padStart(2, "0")}_v1.svg`
        );
        StorageService.saveObject(storageKey, imgRes.data);

        const imgAsset = DarktoonRepository.createAsset({
          project_id: params.projectId,
          scene_id: sc.id,
          asset_type: "scene_image",
          storage_key: storageKey,
          provider: imgRes.provider,
          model: imgRes.model,
          prompt: sc.image_prompt,
          width: project.aspect_ratio === "9:16" ? 1080 : 1920,
          height: project.aspect_ratio === "9:16" ? 1920 : 1080,
          duration: Number((sc.end_time - sc.start_time).toFixed(2)),
          metadata: {
            background_id: sc.background.asset_id,
            character_ids: sc.characters.map((c) => c.character_id),
          },
          is_mock: imgRes.is_mock,
          status: "COMPLETED",
        });

        // Animation Routing & Clip Generation
        const decision = AnimationRouterService.decideAnimationMethod({
          characters: sc.characters,
          camera_direction: sc.camera_direction,
          narrative_purpose: sc.narrative_purpose,
          requestedMethod: sc.animation_method,
        });

        const animConfig = AnimationRouterService.buildAnimationConfig(sc);
        DarktoonRepository.saveAnimationClip({
          scene_id: sc.id,
          method: decision.method,
          animation_config: animConfig,
          asset_id: imgAsset.id,
          start_time: sc.start_time,
          end_time: sc.end_time,
          status: "COMPLETED",
        });

        DarktoonRepository.updateScene(sc.id, {
          animation_method: decision.method,
          animation_reason: decision.reason,
          status: "GENERATED",
        });
      }

      DarktoonRepository.rebuildTimelineClips(params.projectId);
      DarktoonRepository.createProjectVersionSnapshot(params.projectId);
      DarktoonRepository.updateProject(params.projectId, {
        status: "READY_FOR_REVIEW",
      });

      const finalScenes = DarktoonRepository.getScenesByProject(
        params.projectId
      );

      // Cost tracking
      DarktoonRepository.recordCost({
        project_id: params.projectId,
        provider: llmProvider.name,
        model: `${llmProvider.model}+${imageProvider.model}`,
        operation: "STORYBOARD_AND_SCENE_GENERATION",
        usage: {
          scenes_count: finalScenes.length,
          characters_count: characters.length,
          is_mock,
        },
        estimated_cost_usd: is_mock
          ? 0
          : Number((finalScenes.length * 0.04).toFixed(4)),
      });

      const completedJob = DarktoonRepository.updateJob(job.id, {
        status: "COMPLETED",
        output_payload: {
          scenes_count: finalScenes.length,
          characters_count: characters.length,
          is_mock,
        },
      })!;

      return {
        scenes: finalScenes,
        characters,
        job: completedJob,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      DarktoonRepository.updateJob(job.id, {
        status: "FAILED",
        error_message: msg,
      });
      DarktoonRepository.updateProject(params.projectId, { status: "FAILED" });
      throw err;
    }
  }

  /**
   * Regenerates a single scene's image asset, creating a new version (version + 1)
   * while preserving all previous asset versions for rollback.
   */
  static async regenerateSceneImage(params: {
    sceneId: string;
    promptOverride?: string;
    providerOverride?: "openai" | "gemini" | "mock";
  }): Promise<{ scene: SceneRecord; newAsset: AssetRecord }> {
    const scene = DarktoonRepository.getSceneById(params.sceneId);
    if (!scene) {
      throw new Error("SCENE_NOT_FOUND");
    }
    const project = DarktoonRepository.getProject(scene.project_id)!;
    const characters = DarktoonRepository.getCharactersByProject(
      scene.project_id
    );
    const charMap = new Map(characters.map((c) => [c.id, c]));

    const imageProvider = ProviderRegistry.getImage(params.providerOverride);
    const effectivePrompt = params.promptOverride || scene.image_prompt;

    const sceneCharsWithProfiles = scene.characters
      .map((placement) => ({
        profile: charMap.get(placement.character_id) || characters[0],
        action: placement.action,
        expression: placement.expression,
        position: placement.position,
      }))
      .filter((x) => Boolean(x.profile));

    const imgRes = await imageProvider.generateImage({
      prompt: effectivePrompt,
      negativePrompt: scene.negative_prompt,
      width: project.aspect_ratio === "9:16" ? 1080 : 1920,
      height: project.aspect_ratio === "9:16" ? 1920 : 1080,
      backgroundId: scene.background.asset_id,
      characters: sceneCharsWithProfiles,
      props: scene.props,
      subtitleText: scene.transcript_text,
    });

    const storageKey = StorageService.buildStorageKey(
      scene.project_id,
      "images",
      `scene_${String(scene.sequence_index).padStart(2, "0")}_regen.svg`
    );
    StorageService.saveObject(storageKey, imgRes.data);

    const newAsset = DarktoonRepository.createAsset({
      project_id: scene.project_id,
      scene_id: scene.id,
      asset_type: "scene_image",
      storage_key: storageKey,
      provider: imgRes.provider,
      model: imgRes.model,
      prompt: effectivePrompt,
      width: project.aspect_ratio === "9:16" ? 1080 : 1920,
      height: project.aspect_ratio === "9:16" ? 1920 : 1080,
      duration: Number((scene.end_time - scene.start_time).toFixed(2)),
      metadata: {
        regenerated: true,
        background_id: scene.background.asset_id,
      },
      is_mock: imgRes.is_mock,
      status: "COMPLETED",
    });

    const updatedScene = DarktoonRepository.updateScene(scene.id, {
      image_prompt: effectivePrompt,
      status: "GENERATED",
      quality_issues: [],
    })!;

    DarktoonRepository.recordCost({
      project_id: scene.project_id,
      scene_id: scene.id,
      provider: imgRes.provider,
      model: imgRes.model,
      operation: "REGENERATE_SCENE_IMAGE",
      usage: { version: newAsset.version, is_mock: imgRes.is_mock },
      estimated_cost_usd: imgRes.is_mock ? 0 : 0.04,
    });

    return { scene: updatedScene, newAsset };
  }

  /**
   * Regenerates a single scene's animation clip (supporting RIG_2D, AI_VIDEO with automatic fallback, or STATIC_MOTION).
   */
  static async regenerateSceneAnimation(params: {
    sceneId: string;
    methodOverride?: AnimationMethod;
    motionPromptOverride?: string;
    providerOverride?: "openai" | "gemini" | "replicate" | "mock";
  }): Promise<{ scene: SceneRecord; animationClip: AnimationClipRecord }> {
    const scene = DarktoonRepository.getSceneById(params.sceneId);
    if (!scene) {
      throw new Error("SCENE_NOT_FOUND");
    }

    const motionPrompt = params.motionPromptOverride || scene.motion_prompt;
    const requestedMethod = params.methodOverride || scene.animation_method;

    let finalMethod: AnimationMethod = requestedMethod;
    let finalReason = scene.animation_reason;
    let fallbackApplied = false;

    if (requestedMethod === "AI_VIDEO") {
      const videoProvider = ProviderRegistry.getVideo(params.providerOverride);
      const vidRes = await videoProvider.imageToVideo({
        sceneImageKey: scene.primary_asset?.storage_key || "",
        motionPrompt,
        negativePrompt: scene.negative_prompt,
        durationSec: scene.end_time - scene.start_time,
        cameraMovement: scene.camera_direction.movement,
      });

      if (vidRes.fallbackToRig) {
        finalMethod = "RIG_2D";
        fallbackApplied = true;
        finalReason =
          vidRes.reason ||
          "AI Video Provider chưa cấu hình; tự động chuyển về RIG_2D.";
      } else {
        finalMethod = "AI_VIDEO";
        finalReason =
          vidRes.reason ||
          `Đã tạo chuyển động AI_VIDEO bằng ${vidRes.provider} (${vidRes.model}).`;
      }
    } else {
      const decision = AnimationRouterService.decideAnimationMethod({
        characters: scene.characters,
        camera_direction: scene.camera_direction,
        narrative_purpose: scene.narrative_purpose,
        requestedMethod,
      });
      finalMethod = decision.method;
      finalReason = decision.reason;
    }

    const animConfig = AnimationRouterService.buildAnimationConfig(
      scene,
      fallbackApplied,
      fallbackApplied ? finalReason : undefined
    );

    const clip = DarktoonRepository.saveAnimationClip({
      scene_id: scene.id,
      method: finalMethod,
      animation_config: animConfig,
      asset_id: scene.primary_asset?.id || null,
      start_time: scene.start_time,
      end_time: scene.end_time,
      status: "COMPLETED",
    });

    const updatedScene = DarktoonRepository.updateScene(scene.id, {
      animation_method: finalMethod,
      animation_reason: finalReason,
      motion_prompt: motionPrompt,
      status: "GENERATED",
      quality_issues: [],
    })!;

    return { scene: updatedScene, animationClip: clip };
  }
}
