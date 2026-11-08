"""DARKTOON AI - Japanese Anime Cinematic Engine 2.0
Quy chuẩn phong cách & Bộ điều phối tổng thể (Master Pipeline Orchestrator)
"""

import json
import sys
import argparse
from typing import Dict, Any, List

from anime_visual_config import CONFIG, AnimeVisualConfig
from character_consistency import CHARACTER_ENGINE, CharacterDNA
from scene_composition import SceneCompositionDirector, CAMERA_TYPES
from cinematic_prompt_director import build_scene_prompt
from visual_quality_checker import VisualQualityChecker, QualityCheckResult
from anime_scene_analyzer import AnimeSceneAnalyzer


class JapaneseAnimeCinematicEngine:
    """Động cơ điều phối toàn bộ chu trình sản xuất visual Anime 2.0 cho DARKTOON AI"""

    def __init__(self, api_key: str = None):
        self.config = CONFIG
        self.analyzer = AnimeSceneAnalyzer(api_key=api_key)
        self.char_engine = CHARACTER_ENGINE
        self.qc_checker = VisualQualityChecker()

    def process_storyboard(
        self,
        transcript: str,
        total_duration_sec: float = 65.0,
        character_names: List[str] = None
    ) -> Dict[str, Any]:
        """Quy trình hoàn chỉnh 6 bước từ Lời thoại Audio -> Kịch bản Visual Anime đạt chuẩn QC"""
        character_names = character_names or ["Hu"]

        # Bước 1 & 2: Phân tích transcript thành các cảnh ngắn theo nhịp thời gian
        analysis_result = self.analyzer.analyze_transcript(transcript, total_duration_sec)
        scenes = analysis_result.get("scenes", [])

        production_scenes = []
        overall_qc_scores = []

        # Bước 3, 4, 5: Xây dựng Prompt Anime điện ảnh, khóa nhân vật & Kiểm định chất lượng
        for sc in scenes:
            narration = sc.get("narration", "")
            location = sc.get("location", "")
            action = sc.get("action", "sitting")
            emotion = sc.get("emotion", "neutral")
            camera = sc.get("camera", "medium")
            time_of_day = sc.get("time_of_day", "day")
            weather = sc.get("weather", "clear")
            lighting = sc.get("lighting", "")

            # Tạo prompt điện ảnh chuẩn Makoto Shinkai
            prompt_data = build_scene_prompt(
                narration=narration,
                characters=character_names,
                location=location,
                action=action,
                emotion=emotion,
                camera=camera,
                time_of_day=time_of_day,
                weather=weather,
                lighting_override=lighting
            )

            # Đánh giá QC chất lượng hình ảnh
            qc: QualityCheckResult = self.qc_checker.evaluate_scene_prompt(
                prompt=prompt_data["prompt"],
                negative_prompt=prompt_data["negative_prompt"],
                narration=narration,
                has_character=bool(character_names)
            )

            overall_qc_scores.append(qc.score)

            production_scenes.append({
                "sequence_index": sc.get("sequence_index", len(production_scenes) + 1),
                "narration": narration,
                "start_time": sc.get("start_time", 0.0),
                "end_time": sc.get("end_time", 0.0),
                "duration": sc.get("duration", 0.0),
                "location": location,
                "action": action,
                "emotion": emotion,
                "camera": camera,
                "transition": sc.get("transition", "dissolve"),
                "prompt": prompt_data["prompt"],
                "negative_prompt": prompt_data["negative_prompt"],
                "aspect_ratio": prompt_data["aspect_ratio"],
                "layers": prompt_data["layers"],
                "qc": {
                    "passed": qc.passed,
                    "score": qc.score,
                    "issues": qc.issues,
                    "recommendations": qc.recommendations
                }
            })

        avg_qc = round(sum(overall_qc_scores) / max(1, len(overall_qc_scores)), 2)

        return {
            "style_name": self.config.style_name,
            "quality_mode": self.config.quality_mode,
            "aspect_ratio": self.config.aspect_ratio,
            "total_duration": total_duration_sec,
            "average_qc_score": avg_qc,
            "all_qc_passed": all(sc["qc"]["passed"] for sc in production_scenes),
            "scenes": production_scenes
        }


def main():
    if sys.stdout.encoding.lower() != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="DARKTOON AI - Japanese Anime Cinematic Engine 2.0 CLI")
    parser.add_argument("--transcript", type=str, default="", help="Transcript audio text")
    parser.add_argument("--duration", type=float, default=65.0, help="Total duration in seconds")
    parser.add_argument("--output", type=str, default="", help="Output JSON path")
    args = parser.parse_args()

    default_transcript = (
        "Chào bạn, người có lẽ đang có cả trăm tab suy nghĩ đang mở trong đầu. "
        "Cảm ơn bạn vì đã quyết định mở thêm một tab này nữa và dành lựa chọn đó cho mình. "
        "Mong rằng âm thanh từ chiếc tab này sẽ đủ dịu dàng để bạn có thể tạm thời lỡ tab khác nhé, và mình là Hu. "
        "Dạo này cũng bắt đầu vào mùa thu rồi mọi người ạ. Chiều nay thì gió hơi se lạnh. "
        "Thành phố cũng bắt đầu chậm lại, người người vội vã trở về nhà. Ánh đèn đường thì vừa kịp bật lên, vàng ấm. "
        "Mình từng nghĩ là cô đơn là khi mà mình chẳng có ai ở bên. Nhưng mà càng lớn thì mình càng hiểu là đôi khi cô đơn là lúc có người ở bên mà lòng mình thì vẫn thấy trống."
    )

    text = args.transcript.strip() or default_transcript
    engine = JapaneseAnimeCinematicEngine()
    result = engine.process_storyboard(text, total_duration_sec=args.duration)

    formatted_json = json.dumps(result, indent=2, ensure_ascii=False)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(formatted_json)
        print(f"Đã xuất kịch bản Anime Storyboard ra: {args.output}")
    else:
        print(formatted_json)


if __name__ == "__main__":
    main()
