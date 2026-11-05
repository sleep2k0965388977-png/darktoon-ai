// ============================================================================
// DARKTOON AI — Hybrid Animation Router & Keyframe Builder
// (src/backend/services/animationRouterService.ts)
// ============================================================================

import type {
  AnimationClipRecord,
  AnimationMethod,
  SceneAnimationActionKeyframe,
  SceneRecord,
} from "../../types/darktoon.ts";
import { ProviderRegistry } from "../providers/providerRegistry.ts";

export class AnimationRouterService {
  /**
   * Decides the optimal animation method (RIG_2D, AI_VIDEO, or STATIC_MOTION)
   * based on scene complexity, character count, actions, and provider configuration.
   */
  static decideAnimationMethod(scene: {
    characters: SceneRecord["characters"];
    camera_direction: SceneRecord["camera_direction"];
    narrative_purpose: string;
    requestedMethod?: AnimationMethod;
  }): {
    method: AnimationMethod;
    reason: string;
  } {
    if (scene.requestedMethod) {
      return {
        method: scene.requestedMethod,
        reason: `Người dùng / Storyboard chỉ định trực tiếp phương pháp ${scene.requestedMethod}.`,
      };
    }

    const charCount = scene.characters.length;
    const primaryAction = scene.characters[0]?.action || "idle";

    // Atmospheric scene with no character movement -> STATIC_MOTION
    if (charCount === 0) {
      return {
        method: "STATIC_MOTION",
        reason:
          "Cảnh không có nhân vật chuyển động; ưu tiên STATIC_MOTION (camera pan/push-in + parallax) để tiết kiệm chi phí.",
      };
    }

    // Complex multi-character or falling/metaphorical interaction -> candidate for AI_VIDEO
    const isComplexAction =
      primaryAction === "falling" ||
      (charCount >= 3 && primaryAction === "running");

    if (isComplexAction) {
      const videoProvider = ProviderRegistry.getVideo();
      if (videoProvider.isConfigured()) {
        return {
          method: "AI_VIDEO",
          reason:
            "Cảnh có tương tác vật lý/chuyển động phức tạp vượt quá phạm vi khớp xương 2D cơ bản; chọn AI_VIDEO.",
        };
      }
      return {
        method: "RIG_2D",
        reason:
          "Cảnh phức tạp phù hợp với AI_VIDEO nhưng Video Provider đang ở trạng thái NOT_CONFIGURED; tự động chuyển về RIG_2D theo quy tắc an toàn PRD Mục 7.",
      };
    }

    return {
      method: "RIG_2D",
      reason: `Hành động '${primaryAction}' nằm trong bộ 17 hành động chuẩn của hệ thống 2D Rig 8 bộ phận; chọn RIG_2D để đảm bảo 100% tính nhất quán nhân vật và tối ưu chi phí.`,
    };
  }

  /**
   * Builds concrete animation keyframes and configuration for a scene.
   */
  static buildAnimationConfig(
    scene: SceneRecord,
    fallbackApplied: boolean = false,
    fallbackReason?: string
  ): AnimationClipRecord["animation_config"] {
    const duration = Math.max(1, Number((scene.end_time - scene.start_time).toFixed(2)));
    const actions: SceneAnimationActionKeyframe[] = [];

    for (const ch of scene.characters) {
      actions.push({
        target: ch.character_id,
        action: ch.action,
        start: 0,
        duration,
      });
      actions.push({
        target: ch.character_id,
        action: "idle_breathing",
        start: 0,
        duration,
      });
      if (scene.transcript_text.trim().length > 0) {
        actions.push({
          target: ch.character_id,
          action: "lip_sync_dialogue",
          start: 0.2,
          duration: Math.max(0.5, duration - 0.4),
        });
      }
    }

    return {
      actions,
      camera: scene.camera_direction,
      lip_sync_enabled: true,
      fallback_applied: fallbackApplied,
      fallback_reason: fallbackReason,
    };
  }
}
