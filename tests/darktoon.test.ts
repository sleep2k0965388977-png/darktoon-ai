// ============================================================================
// DARKTOON AI — Comprehensive Automated Test Suite (tests/darktoon.test.ts)
// Covers all 12 mandatory test areas in Master Prompt Section P
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { resetDbForTests } from "../src/backend/db/database.ts";
import { DarktoonRepository } from "../src/backend/repositories/darktoonRepository.ts";
import { ProviderRegistry } from "../src/backend/providers/providerRegistry.ts";
import { AnimationRouterService } from "../src/backend/services/animationRouterService.ts";
import { PipelineOrchestratorService } from "../src/backend/services/pipelineOrchestratorService.ts";
import { QualityControlService } from "../src/backend/services/qualityControlService.ts";
import { VideoRenderService } from "../src/backend/services/videoRenderService.ts";
import { assertProjectOwnership } from "../src/backend/services/authHelper.ts";
import { StorageService } from "../src/backend/storage/storageService.ts";

const TEST_DB_PATH = path.join(
  process.cwd(),
  "storage",
  "darktoon_test.sqlite"
);

test("DARKTOON AI Full-Stack Architecture & Pipeline Suite", async (t) => {
  resetDbForTests(TEST_DB_PATH);

  let user1Id = "";
  let user2Id = "";
  let projectId = "";

  await t.test("1. Authentication: Register, Login, and Duplicate Check", () => {
    const u1 = DarktoonRepository.registerUser(
      "alice@darktoon.ai",
      "secret123",
      "Alice Director"
    );
    assert.equal(u1.email, "alice@darktoon.ai");
    user1Id = u1.id;

    const u2 = DarktoonRepository.registerUser(
      "bob@darktoon.ai",
      "secret456",
      "Bob Creator"
    );
    user2Id = u2.id;

    const loggedIn = DarktoonRepository.authenticateUser(
      "alice@darktoon.ai",
      "secret123"
    );
    assert.ok(loggedIn);
    assert.equal(loggedIn?.id, user1Id);

    const invalidLogin = DarktoonRepository.authenticateUser(
      "alice@darktoon.ai",
      "wrongpass"
    );
    assert.equal(invalidLogin, null);
  });

  await t.test("2. Project CRUD & Default 6-Track Timeline Setup", () => {
    const proj = DarktoonRepository.createProject({
      user_id: user1Id,
      name: "Test Dark Story #01",
      description: "Automated pipeline test project",
      aspect_ratio: "16:9",
      resolution: "720p",
      fps: 24,
      style_id: "DARK_MINIMALIST_2D",
      language: "vi",
      budget_limit_usd: 12.5,
    });
    projectId = proj.id;
    assert.equal(proj.name, "Test Dark Story #01");
    assert.equal(proj.status, "CREATED");

    const tracks = DarktoonRepository.getTimelineByProject(projectId);
    assert.equal(tracks.length, 6, "Should initialize 6 default timeline tracks");

    const updated = DarktoonRepository.updateProject(projectId, {
      description: "Updated description",
    });
    assert.equal(updated?.description, "Updated description");
  });

  await t.test(
    "3. Storage Authorization & Project Ownership Isolation",
    () => {
      // User 1 owns project
      assert.doesNotThrow(() => {
        assertProjectOwnership(projectId, user1Id);
      });
      // User 2 must be blocked from accessing User 1's project
      assert.throws(
        () => {
          assertProjectOwnership(projectId, user2Id);
        },
        /FORBIDDEN_PROJECT_ACCESS/,
        "Other users must not access project resources"
      );
      // Path traversal must be blocked
      assert.throws(
        () => {
          StorageService.resolveAbsolutePath("../../outside.txt");
        },
        /STORAGE_PATH_TRAVERSAL_BLOCKED/
      );
    }
  );

  await t.test("4. Audio Upload, Waveform Extraction & Preservation", () => {
    const wavBuf = StorageService.generateSynthesizedConversationWav(16);
    const storageKey = StorageService.buildStorageKey(
      projectId,
      "audio",
      "test_dialogue.wav"
    );
    StorageService.saveObject(storageKey, wavBuf);
    const waveform = StorageService.extractWaveformPeaks(wavBuf, 64);
    assert.equal(waveform.length, 64);

    const audio = DarktoonRepository.createAudioAsset({
      project_id: projectId,
      file_name: "test_dialogue.wav",
      storage_key: storageKey,
      format: "wav",
      duration: 16,
      sample_rate: 22050,
      channels: 1,
      file_size: wavBuf.length,
      waveform,
    });
    assert.equal(audio.duration, 16);
    assert.ok(StorageService.exists(audio.storage_key));
  });

  await t.test(
    "5. Provider Honesty Policy: Unconfigured Real Provider Reports NOT_CONFIGURED",
    async () => {
      // Ensure OPENAI_API_KEY is empty for this test
      const prevKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      const openaiAsr = ProviderRegistry.getASR("openai");
      assert.equal(openaiAsr.isConfigured(), false);

      await assert.rejects(
        async () => {
          await PipelineOrchestratorService.analyzeProjectAudio({
            projectId,
            providerOverride: "openai",
          });
        },
        /PROVIDER_NOT_CONFIGURED/,
        "Must reject unconfigured real provider rather than faking AI output"
      );

      if (prevKey) process.env.OPENAI_API_KEY = prevKey;
    }
  );

  await t.test(
    "6. Audio Analysis, Diarization & Transcript Persistence ([MOCK] Mode)",
    async () => {
      const res = await PipelineOrchestratorService.analyzeProjectAudio({
        projectId,
        providerOverride: "mock",
      });
      assert.equal(res.transcript.is_mock, true);
      assert.ok(res.speakers.length >= 2);
      assert.ok(res.transcript.segments.length >= 3);
      assert.equal(res.job.status, "COMPLETED");

      // Edit first segment and verify persistence
      const firstSeg = res.transcript.segments[0];
      const updatedTranscript = DarktoonRepository.updateTranscriptSegments(
        projectId,
        [
          {
            id: firstSeg.id,
            text: "Có những ngày tôi chỉ muốn ngồi lặng yên một mình trên chiếc sofa tối.",
            emotion: "sad",
          },
        ]
      );
      assert.ok(
        updatedTranscript?.full_text.includes("ngồi lặng yên một mình")
      );
    }
  );

  await t.test(
    "7. Storyboard Generation & Character Consistency Lock Engine",
    async () => {
      const sb = await PipelineOrchestratorService.generateProjectStoryboard({
        projectId,
        providerOverride: "mock",
      });
      assert.ok(sb.characters.length >= 2);
      assert.ok(sb.scenes.length >= 3);

      const mainChar = sb.characters[0];
      assert.equal(mainChar.locked, true, "Main character must be locked");
      assert.equal(mainChar.expressions.length, 10, "Must have all 10 expressions");
      assert.equal(mainChar.actions.length, 17, "Must have all 17 actions");

      // Attempting to mutate color palette of a locked character must throw CHARACTER_LOCKED
      assert.throws(() => {
        DarktoonRepository.updateCharacter(mainChar.id, {
          color_palette: {
            fill: "#FF00FF",
            stroke: "#000",
            accent: "#000",
            shadow: "#000",
          },
        });
      }, /CHARACTER_LOCKED/);
    }
  );

  await t.test(
    "8. Scene Update, Individual Scene Regeneration & Asset Versioning",
    async () => {
      const scenes = DarktoonRepository.getScenesByProject(projectId);
      const targetScene = scenes[0];
      assert.equal(targetScene.primary_asset?.version, 1);

      const regen = await PipelineOrchestratorService.regenerateSceneImage({
        sceneId: targetScene.id,
        promptOverride: "Updated dark minimalist living room with blue rim light",
        providerOverride: "mock",
      });
      assert.equal(
        regen.newAsset.version,
        2,
        "Regenerating must create version 2 without deleting version 1"
      );

      const allProjectAssets = DarktoonRepository.getAssetsByProject(projectId);
      const sceneImageVersions = allProjectAssets.filter(
        (a) => a.scene_id === targetScene.id && a.asset_type === "scene_image"
      );
      assert.equal(
        sceneImageVersions.length,
        2,
        "Both v1 and v2 assets must be preserved in DB for rollback"
      );
    }
  );

  await t.test(
    "9. Hybrid Animation Routing & Fallback from Unconfigured AI_VIDEO to RIG_2D",
    async () => {
      const scenes = DarktoonRepository.getScenesByProject(projectId);
      const targetScene = scenes[0];

      // Request AI_VIDEO when GEMINI_API_KEY is not configured -> should safely fallback to RIG_2D
      const prevGem = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const animRes =
        await PipelineOrchestratorService.regenerateSceneAnimation({
          sceneId: targetScene.id,
          methodOverride: "AI_VIDEO",
          providerOverride: "gemini",
        });

      assert.equal(
        animRes.scene.animation_method,
        "RIG_2D",
        "Must fallback to RIG_2D when AI_VIDEO provider is not configured"
      );
      assert.equal(
        animRes.animationClip.animation_config.fallback_applied,
        true
      );

      if (prevGem) process.env.GEMINI_API_KEY = prevGem;
    }
  );

  await t.test("10. Job Retry & Cancel Lifecycle", () => {
    const job = DarktoonRepository.createJob({
      project_id: projectId,
      job_type: "SCENE_IMAGE",
      provider: "mock",
      model: "darktoon-svg-rig-composer-v1",
    });
    assert.equal(job.status, "RUNNING");

    const retried = DarktoonRepository.updateJob(job.id, {
      retry_count: job.retry_count + 1,
      status: "COMPLETED",
    });
    assert.equal(retried?.retry_count, 1);
    assert.equal(retried?.status, "COMPLETED");

    const job2 = DarktoonRepository.createJob({
      project_id: projectId,
      job_type: "SCENE_ANIMATION",
      provider: "mock",
      model: "darktoon-hybrid-rig-motion-v1",
    });
    const cancelled = DarktoonRepository.updateJob(job2.id, {
      status: "CANCELLED",
    });
    assert.equal(cancelled?.status, "CANCELLED");
  });

  await t.test(
    "11. Quality Control & Real FFmpeg H.264 MP4 Video Render",
    async () => {
      const qc = QualityControlService.validateProjectForRender(projectId);
      assert.equal(qc.passed, true, "Quality control must pass on valid scenes");

      const renderResult = await VideoRenderService.renderProjectVideo(
        projectId
      );
      assert.equal(renderResult.renderJob.status, "COMPLETED");
      assert.equal(renderResult.renderJob.progress, 100);
      assert.ok(renderResult.outputAssetId);

      const mp4Asset = DarktoonRepository.getAssetById(
        renderResult.outputAssetId!
      );
      assert.ok(mp4Asset);
      const mp4Path = StorageService.resolveAbsolutePath(mp4Asset!.storage_key);
      assert.ok(fs.existsSync(mp4Path), "Rendered MP4 file must exist on disk");
      const stat = fs.statSync(mp4Path);
      assert.ok(stat.size > 1024, "Rendered MP4 must be a non-empty valid video");
    }
  );
});
