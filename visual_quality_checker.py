"""DARKTOON AI - Visual Quality Checker Module
Kiểm soát chất lượng (QC) tự động cho prompt và phân cảnh anime.
Tách riêng các tiêu chí: Prompt Completeness, Audio Relevance, Character Consistency, Actual Image Quality.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List


@dataclass
class QualityCheckResult:
    passed: bool
    score: float  # Tổng thể
    metrics: Dict[str, Any] = field(default_factory=dict)
    issues: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


class VisualQualityChecker:
    """Bộ kiểm định tiêu chuẩn điện ảnh cho Darktoon AI"""

    MIN_PROMPT_CHARS = 140
    REQUIRED_KEYWORDS = ["anime", "cinematic", "lighting"]

    @classmethod
    def evaluate_scene_prompt(
        cls,
        prompt: str,
        negative_prompt: str,
        narration: str,
        characters: List[str] = None
    ) -> QualityCheckResult:
        issues = []
        recommendations = []
        characters = characters or []

        p_lower = prompt.lower()
        neg_lower = negative_prompt.lower()

        # =====================================================================
        # 1. Prompt Completeness (Độ đầy đủ của Prompt)
        # =====================================================================
        completeness_score = 1.0
        if len(prompt.strip()) < cls.MIN_PROMPT_CHARS:
            completeness_score -= 0.4
            issues.append(f"Prompt chưa đủ chi tiết ({len(prompt)} ký tự).")
        missing_kw = [kw for kw in cls.REQUIRED_KEYWORDS if kw not in p_lower]
        if missing_kw:
            completeness_score -= 0.15 * len(missing_kw)
            issues.append(f"Thiếu chỉ thị phong cách: {', '.join(missing_kw)}")
        if "foreground" not in p_lower or "background" not in p_lower:
            completeness_score -= 0.15
            issues.append("Thiếu phân lớp Tiền cảnh / Hậu cảnh.")

        completeness_score = max(0.0, min(1.0, round(completeness_score, 2)))

        # =====================================================================
        # 2. Audio Relevance (Độ liên kết trực tiếp với câu thoại)
        # =====================================================================
        relevance_score = 1.0
        narration_words = [w for w in narration.lower().split() if len(w) > 3]
        if narration_words:
            matched = sum(1 for w in narration_words if w in p_lower)
            match_ratio = matched / len(narration_words)
            if match_ratio < 0.2:
                relevance_score = 0.3
                issues.append("Hình ảnh và địa điểm chưa ăn khớp với từ ngữ trong câu thoại.")
            elif match_ratio < 0.5:
                relevance_score = 0.7
            else:
                relevance_score = 0.95
        else:
            relevance_score = 0.8

        relevance_score = max(0.0, min(1.0, round(relevance_score, 2)))

        # =====================================================================
        # 3. Character Consistency (Tính nhất quán của nhân vật)
        # =====================================================================
        consistency_score = 1.0
        if characters:
            for char_name in characters:
                if f"character anchor [{char_name.lower()}]" not in p_lower and f"[{char_name.lower()}]" not in p_lower:
                    consistency_score -= 0.4
                    issues.append(f"Chưa khóa Character Anchor cho {char_name}.")
                if f"different outfit for {char_name.lower()}" not in neg_lower and f"different outfit" not in neg_lower:
                    consistency_score -= 0.15
                    issues.append(f"Thiếu negative rule chống tráo trang phục cho {char_name}.")
        else:
            consistency_score = 0.85

        consistency_score = max(0.0, min(1.0, round(consistency_score, 2)))

        # =====================================================================
        # 4. Actual Image Quality (Chất lượng ảnh thực tế)
        # =====================================================================
        # TUÂN THỦ NGUYÊN TẮC: Nếu chưa có mô hình VLM / CLIP / Aesthetic Scorer
        # đánh giá pixel thực tế, BẮT BUỘC ghi "not_evaluated". KHÔNG tự chấm 100%.
        actual_image_quality = "not_evaluated"

        # Tổng điểm khả thi của Prompt
        overall_score = round((completeness_score * 0.4 + relevance_score * 0.35 + consistency_score * 0.25), 2)
        passed = overall_score >= 0.75 and len(issues) <= 1

        return QualityCheckResult(
            passed=passed,
            score=overall_score,
            metrics={
                "prompt_completeness": f"{int(completeness_score * 100)}/100",
                "audio_relevance": f"{int(relevance_score * 100)}/100",
                "character_consistency": f"{int(consistency_score * 100)}/100",
                "actual_image_quality": actual_image_quality
            },
            issues=issues,
            recommendations=recommendations
        )
