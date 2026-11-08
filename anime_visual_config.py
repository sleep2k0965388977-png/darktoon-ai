"""DARKTOON AI - Japanese Anime Cinematic Engine 2.0
Cấu hình phong cách nghệ thuật Makoto Shinkai / Kimi No Na Wa
"""

from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class AnimeVisualConfig:
    style_name: str = "Japanese Cinematic Anime"
    quality_mode: str = "maximum"

    # Phong cách cốt lõi (Makoto Shinkai / Kimi No Na Wa / CoMix Wave Films)
    visual_style: str = (
        "masterpiece, premium Japanese animated feature film aesthetic, "
        "Makoto Shinkai and Kimi No Na Wa inspired background art, "
        "highly detailed hand-painted environmental textures, "
        "beautiful atmospheric perspective, expressive anime character design, "
        "rich environmental storytelling"
    )

    # Ánh sáng điện ảnh
    lighting: str = (
        "cinematic natural lighting, volumetric crepuscular rays, sunlight breaking through clouds, "
        "soft global illumination, realistic bounce light, delicate golden hour rim lighting, "
        "detailed ambient occlusion and shadows"
    )

    # Bối cảnh & Chi tiết môi trường
    environment: str = (
        "intricate Japanese background details, layered cumulus clouds with silver linings, "
        "luminous gradient twilight and sunset sky, realistic wet asphalt puddles reflecting city lights, "
        "atmospheric depth, carefully painted Japanese architectural scenery"
    )

    # Bảng màu
    color: str = (
        "vibrant yet balanced cinematic color grading, deep celestial indigo, luminous golden amber, "
        "warm sunlight highlights, rich natural foliage and clean anime shading"
    )

    # Bố cục 3 lớp (Tiền cảnh - Trung cảnh - Hậu cảnh)
    composition: str = (
        "professional cinematic composition, clear foreground midground background layer separation, "
        "strong visual leading lines, golden ratio framing, rule of thirds, atmospheric haze"
    )

    # Tiêu cực (Negative prompt) loại bỏ lỗi dị tật và ảnh rác
    negative_prompt: str = (
        "low quality, blurry, pixelated, flat lighting, 3d render, generic background, "
        "empty environment, poor anatomy, deformed hands, extra fingers, missing limbs, "
        "duplicate characters, inconsistent clothing, random floating objects, "
        "subtitles, text, watermark, logo, signature"
    )

    aspect_ratio: str = "16:9"

    def build_style_prompt(self) -> str:
        return ", ".join([
            self.visual_style,
            self.lighting,
            self.environment,
            self.color,
            self.composition
        ])


CONFIG = AnimeVisualConfig()
