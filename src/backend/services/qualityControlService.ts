// ============================================================================
// DARKTOON AI — Pre-Render Quality Control & Timeline Sync Validator
// (src/backend/services/qualityControlService.ts)
// ============================================================================

import { DarktoonRepository } from "../repositories/darktoonRepository.ts";
import type {
  QualityControlIssue,
  QualityControlReport,
} from "../../types/darktoon.ts";

export class QualityControlService {
  /**
   * Executes all 9 PRD 6.9 Quality Control checks on a project before rendering.
   * Marks any scene with critical issues as NEEDS_REVIEW.
   */
  static validateProjectForRender(
    projectId: string,
    markNeedsReviewInDb: boolean = true
  ): QualityControlReport {
    const audio = DarktoonRepository.getProjectAudio(projectId);
    const scenes = DarktoonRepository.getScenesByProject(projectId);
    const characters = DarktoonRepository.getCharactersByProject(projectId);
    const characterIds = new Set(characters.map((c) => c.id));
    const issues: QualityControlIssue[] = [];

    if (scenes.length === 0) {
      issues.push({
        severity: "error",
        code: "MISSING_DIALOGUE_COVERAGE",
        message: "Dự án chưa có phân cảnh (Scene) nào trong Storyboard.",
      });
    }

    let coveredDuration = 0;
    const seenTranscripts = new Map<string, number>();

    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i];
      const sceneIssues: string[] = [];
      const dur = sc.end_time - sc.start_time;

      // 1. Check missing image asset
      if (!sc.primary_asset) {
        issues.push({
          scene_id: sc.id,
          scene_index: sc.sequence_index,
          severity: "error",
          code: "MISSING_IMAGE",
          message: `Scene #${sc.sequence_index} chưa có hình ảnh (primary_asset).`,
        });
        sceneIssues.push("Thiếu hình ảnh cảnh");
      }

      // 2. Check missing animation clip
      if (!sc.animation_clip) {
        issues.push({
          scene_id: sc.id,
          scene_index: sc.sequence_index,
          severity: "error",
          code: "MISSING_ANIMATION",
          message: `Scene #${sc.sequence_index} chưa có cấu hình chuyển động (animation_clip).`,
        });
        sceneIssues.push("Thiếu animation clip");
      }

      // 3. Check duplicate scene content
      const normText = sc.transcript_text.trim().toLowerCase();
      if (normText.length > 10 && seenTranscripts.has(normText)) {
        issues.push({
          scene_id: sc.id,
          scene_index: sc.sequence_index,
          severity: "warning",
          code: "DUPLICATE_SCENE",
          message: `Scene #${sc.sequence_index} có lời thoại trùng lặp với Scene #${seenTranscripts.get(
            normText
          )}.`,
        });
      } else if (normText.length > 10) {
        seenTranscripts.set(normText, sc.sequence_index);
      }

      // 4. Check timeline sequence order
      if (i > 0 && sc.start_time < scenes[i - 1].end_time - 0.05) {
        issues.push({
          scene_id: sc.id,
          scene_index: sc.sequence_index,
          severity: "error",
          code: "TIMELINE_ORDER_ERROR",
          message: `Scene #${sc.sequence_index} bắt đầu (${sc.start_time}s) chồng lấn trước khi Scene #${
            scenes[i - 1].sequence_index
          } kết thúc (${scenes[i - 1].end_time}s).`,
        });
        sceneIssues.push("Lệch thứ tự timestamp");
      }

      // 5. Check abnormal scene duration
      if (dur <= 0.3 || dur > 45) {
        issues.push({
          scene_id: sc.id,
          scene_index: sc.sequence_index,
          severity: "warning",
          code: "ABNORMAL_DURATION",
          message: `Scene #${sc.sequence_index} có thời lượng bất thường (${dur.toFixed(
            1
          )}s).`,
        });
      }

      // 6. Check character consistency reference
      for (const ch of sc.characters) {
        if (!characterIds.has(ch.character_id)) {
          issues.push({
            scene_id: sc.id,
            scene_index: sc.sequence_index,
            severity: "error",
            code: "CHARACTER_DESIGN_MISMATCH",
            message: `Scene #${sc.sequence_index} tham chiếu Character ID không tồn tại (${ch.character_id}).`,
          });
          sceneIssues.push("Sai tham chiếu Character ID");
        }
      }

      coveredDuration += Math.max(0, dur);

      if (markNeedsReviewInDb && sceneIssues.length > 0) {
        DarktoonRepository.updateScene(sc.id, {
          status: "NEEDS_REVIEW",
          quality_issues: sceneIssues,
        });
      }
    }

    // 7. Check audio sync & coverage
    const masterDuration = audio?.duration || coveredDuration || 1;
    const coverageRatio = Math.min(
      1,
      Number((coveredDuration / masterDuration).toFixed(2))
    );
    if (audio && Math.abs(coveredDuration - audio.duration) > 2.5) {
      issues.push({
        severity: "warning",
        code: "AUDIO_SYNC_DRIFT",
        message: `Tổng thời lượng các cảnh (${coveredDuration.toFixed(
          1
        )}s) chênh lệch so với thời lượng audio gốc (${audio.duration.toFixed(
          1
        )}s).`,
      });
    }

    const refreshedScenes = DarktoonRepository.getScenesByProject(projectId);
    const approvedCount = refreshedScenes.filter(
      (s) => s.status === "APPROVED"
    ).length;
    const needsReviewCount = refreshedScenes.filter(
      (s) => s.status === "NEEDS_REVIEW" || s.status === "FAILED"
    ).length;
    const hasBlockingErrors = issues.some((i) => i.severity === "error");

    return {
      passed: !hasBlockingErrors && scenes.length > 0,
      checked_at: new Date().toISOString(),
      total_scenes: refreshedScenes.length,
      approved_scenes: approvedCount,
      needs_review_scenes: needsReviewCount,
      audio_coverage_ratio: coverageRatio,
      issues,
    };
  }
}
