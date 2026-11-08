"""DARKTOON AI - Cinematic Prompt Director Module
Phân tích từng đoạn thoại và tạo prompt anime điện ảnh 16:9 chất lượng cao.
Hỗ trợ mọi nhân vật và bối cảnh linh hoạt, không áp đặt hoodie hay nhân vật mặc định.
"""

from typing import Dict, Any, List, Optional
from anime_visual_config import CONFIG
from scene_composition import CAMERA_TYPES, SceneCompositionDirector
from character_consistency import CHARACTER_ENGINE


def build_scene_prompt(
    narration: str,
    characters: Optional[List[str]] = None,
    location: str = "",
    action: str = "",
    emotion: str = "",
    camera: str = "wide",
    time_of_day: str = "day",
    weather: str = "clear",
    lighting_override: Optional[str] = None
) -> Dict[str, Any]:
    """Tạo prompt hình ảnh chi tiết theo phong cách Makoto Shinkai chuẩn điện ảnh Nhật Bản"""
    characters = characters or []
    camera_prompt = CAMERA_TYPES.get(camera, CAMERA_TYPES["wide"])

    # 1. Khóa nhận dạng nhân vật từ Character Engine
    character_dna_text = CHARACTER_ENGINE.build_character_prompt_clause(characters)

    # 2. Bố cục phân lớp 3 tầng (Foreground, Midground, Background)
    layers = SceneCompositionDirector.plan_composition(
        location=location or "Japanese anime environmental landscape",
        camera=camera,
        has_character=bool(characters)
    )

    # 3. Ánh sáng đặc trưng Makoto Shinkai
    lighting_text = lighting_override or (
        "golden hour late afternoon, warm volumetric sunlight, long cast shadows, glowing dust motes"
        if time_of_day in ("sunset", "dusk", "afternoon")
        else "fresh early morning golden sunlight, soft crisp platform shadows, high atmospheric clarity"
        if time_of_day in ("morning", "early_morning")
        else "deep midnight, warm sodium streetlamp halo, wet asphalt reflections, glowing neon sign"
        if time_of_day in ("night", "midnight")
        else CONFIG.lighting
    )

    prompt = f"""SCENE CONTENT: {narration}
LOCATION & ENVIRONMENT: {location or 'Japanese cinematic anime environment'}
{character_dna_text}
ACTION & INTERACTION: {action}
FACIAL EMOTION & EXPRESSION: {emotion}
TIME OF DAY: {time_of_day}
WEATHER & ATMOSPHERE: {weather}
COMPOSITION LAYERS: {layers.to_prompt_clause()}
LIGHTING: {lighting_text}
VISUAL STYLE: {CONFIG.build_style_prompt()}

MANDATORY CINEMATIC DIRECTIVES:
- Illustrate the exact narrative meaning of the spoken line.
- Show the described action concretely, avoid generic unrelated filler imagery.
- Strictly adhere to the Character Anchor: preserve identical hairstyle, facial structure, and exact attire for each character.
- Complete three-dimensional hand-painted anime environment with foreground, midground, and background separation.
- Rich Makoto Shinkai color gradients, luminous sky, delicate rim light, and soft contact shadows.
- Absolutely NO subtitles, NO floating letters, NO watermarks, NO UI elements inside the generated image."""

    # Tích hợp negative prompt từ từng nhân vật thực tế tham gia cảnh
    neg_rules = [CONFIG.negative_prompt]
    for char_name in characters:
        char_obj = CHARACTER_ENGINE.get_character(char_name)
        if char_obj:
            neg_rules.append(char_obj.get_negative_rules())
    combined_negative = ", ".join(neg_rules)

    return {
        "prompt": prompt.strip(),
        "negative_prompt": combined_negative.strip(),
        "aspect_ratio": CONFIG.aspect_ratio,
        "quality": CONFIG.quality_mode,
        "camera": camera_prompt,
        "layers": {
            "foreground": layers.foreground,
            "midground": layers.midground,
            "background": layers.background
        }
    }
