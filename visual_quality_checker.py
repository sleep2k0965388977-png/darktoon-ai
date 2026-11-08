"""DARKTOON AI - Visual Quality Checker Module
Kiểm soát chất lượng (QC) tự động cho prompt và phân cảnh anime trước khi đưa vào hàng đợi tạo hình ảnh
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Tuple


@dataclass
class QualityCheckResult:
    passed: bool
    score: float  # 0.0 to 1.0
    issues: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)


class VisualQualityChecker:
    """Bộ kiểm định tiêu chuẩn điện ảnh cho Darktoon AI"""

    MIN_PROMPT_CHARS = 120
    REQUIRED_KEYWORDS = ["anime", "cinematic", "lighting"]

    @classmethod
    def evaluate_scene_prompt(
        cls,
        prompt: str,
        negative_prompt: str,
        narration: str,
        has_character: bool = True
    ) -> QualityCheckResult:
        issues = []
        recommendations = []
        score = 1.0

        p_lower = prompt.lower()
        neg_lower = negative_prompt.lower()

        # 1. Kiểm tra độ dài và độ phong phú chi tiết
        if len(prompt.strip()) < cls.MIN_PROMPT_CHARS:
            score -= 0.35
            issues.append(f"Prompt quá ngắn ({len(prompt)} ký tự). Thiếu chi tiết môi trường và ánh sáng điện ảnh.")
            recommendations.append("Bổ sung thêm mô tả ánh sáng volumetric, chi tiết mây tầng Makoto Shinkai hoặc bề mặt vật liệu.")

        # 2. Kiểm tra từ khóa phong cách cốt lõi
        missing_kw = [kw for kw in cls.REQUIRED_KEYWORDS if kw not in p_lower]
        if missing_kw:
            score -= 0.15 * len(missing_kw)
            issues.append(f"Thiếu từ khóa phong cách quan trọng: {', '.join(missing_kw)}")
            recommendations.append("Đảm bảo luôn kết hợp phong cách Japanese Cinematic Anime của Makoto Shinkai.")

        # 3. Kiểm tra tính liên kết với lời thoại (Narrative Relevance)
        narration_words = [w for w in narration.lower().split() if len(w) > 3]
        if narration_words:
            # Kiểm tra xem có ít nhất một vài khái niệm liên quan đến lời thoại không
            match_count = sum(1 for w in narration_words if w in p_lower)
            if match_count == 0 and len(narration_words) >= 3:
                score -= 0.25
                issues.append("Mô tả hình ảnh chưa bám sát nội dung ngữ cảnh câu thoại.")
                recommendations.append("Đưa trực tiếp hành động và bối cảnh từ câu thoại vào prompt.")

        # 4. Kiểm tra khóa nhân vật (Character Consistency Lock)
        if has_character:
            if "character anchor" not in p_lower and "protagonist" not in p_lower:
                score -= 0.20
                issues.append("Chưa kích hoạt Character Anchor Lock cho nhân vật.")
                recommendations.append("Gắn thẻ Character DNA từ CharacterConsistencyEngine.")

        # 5. Kiểm tra phòng chống chữ / phụ đề in đè trong ảnh (No Text Rule)
        if "no subtitles" not in p_lower and "no text" not in p_lower and "text" not in neg_lower:
            score -= 0.15
            issues.append("Chưa có quy tắc cấm sinh chữ/phụ đề rác vào ảnh.")
            recommendations.append("Thêm 'no subtitles, no text inside the image' vào prompt và 'text, watermark' vào negative prompt.")

        # 6. Kiểm tra bố cục phân lớp (Foreground, Midground, Background)
        has_layers = ("foreground" in p_lower) or ("background" in p_lower)
        if not has_layers:
            score -= 0.10
            recommendations.append("Nên phân chia rõ Tiền cảnh, Trung cảnh và Hậu cảnh để tạo hiệu ứng Parallax chuyển động đẹp hơn.")

        score = max(0.0, min(1.0, round(score, 2)))
        passed = score >= 0.70 and len(issues) <= 1

        return QualityCheckResult(
            passed=passed,
            score=score,
            issues=issues,
            recommendations=recommendations,
            metrics={
                "prompt_length": len(prompt),
                "narration_length": len(narration),
                "has_layers": has_layers,
                "has_character_lock": "character anchor" in p_lower
            }
        )
