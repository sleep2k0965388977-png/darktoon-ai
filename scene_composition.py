"""DARKTOON AI - Scene Composition & Cinematic Framing Module
Quản lý góc máy điện ảnh, phân lớp bố cục (Foreground, Midground, Background) và chiều sâu 2.5D
"""

from dataclasses import dataclass
from typing import Dict, Any, List


CAMERA_TYPES: Dict[str, str] = {
    "wide": "extreme wide cinematic establishing shot, expansive sky and layered horizon",
    "medium": "medium cinematic narrative shot, character engaged with surrounding environment",
    "closeup": "emotional close-up portrait, shallow depth of field, sharp focus on expressive eyes and face",
    "low": "dramatic low angle perspective looking up towards character against soaring clouds",
    "high": "cinematic high angle looking down at street scenery with long cast shadows",
    "overhead": "top-down bird-eye aerial perspective, geometric street layout and pavement reflections",
    "tracking": "dynamic lateral tracking camera composition with smooth horizontal motion blur"
}

LIGHTING_PRESETS: Dict[str, str] = {
    "golden_hour": "golden hour late afternoon, warm volumetric sunlight, long cast shadows, glowing dust motes",
    "sunset_twilight": "Makoto Shinkai twilight sky, purple and orange horizon, twinkling early stars and comet trail",
    "night_streetlamp": "deep night, warm amber sodium streetlamp cone, wet asphalt puddle reflections, cozy neon glow",
    "rainy_mood": "overcast soft diffused daylight, gentle vertical rain streaks, glistening droplets on glass",
    "cosmic_stardust": "deep celestial navy void, glowing stardust nebula, soft ethereal luminescence"
}


@dataclass
class CompositionLayers:
    foreground: str
    midground: str
    background: str
    depth_of_field: str
    camera_shot: str

    def to_prompt_clause(self) -> str:
        return (
            f"FOREGROUND: {self.foreground} | "
            f"MIDGROUND: {self.midground} | "
            f"BACKGROUND: {self.background} | "
            f"CAMERA: {self.camera_shot} | "
            f"DEPTH: {self.depth_of_field}"
        )


class SceneCompositionDirector:
    """Tạo bố cục 3 lớp cho cảnh để đảm bảo chiều sâu điện ảnh và hiệu ứng Parallax"""

    @staticmethod
    def plan_composition(
        location: str,
        camera: str = "medium",
        has_character: bool = True
    ) -> CompositionLayers:
        camera_desc = CAMERA_TYPES.get(camera, CAMERA_TYPES["medium"])
        loc = location.lower()

        if "desk" in loc or "phòng làm việc" in loc or "workspace" in loc:
            return CompositionLayers(
                foreground="wooden desk corner, broadcast podcast microphone on boom arm, ceramic warm mug with rising steam",
                midground="anime protagonist Hu sitting comfortably on ergonomic studio chair, typing or resting hands near laptop",
                background="lofi studio window with fairy lights overlooking twilight Tokyo cityscape and glowing tower",
                depth_of_field="subtle bokeh blur on background city lights, crisp focus on character",
                camera_shot=camera_desc
            )
        elif "balcony" in loc or "ban công" in loc or "cửa sổ" in loc:
            return CompositionLayers(
                foreground="black metal balcony railing with a small potted monstera plant catching the wind",
                midground="character leaning gently forward against railing, hair flowing in cool autumn breeze",
                background="soaring Makoto Shinkai cumulus clouds, blazing orange sunset horizon, Tokyo Skytree silhouette",
                depth_of_field="deep cinematic focus with atmospheric haze over distant buildings",
                camera_shot=camera_desc
            )
        elif "street" in loc or "đèn đường" in loc or "phố" in loc:
            return CompositionLayers(
                foreground="wet asphalt road with puddle reflections, parked vintage bicycle with dynamo light",
                midground="character walking alone under glowing curved amber streetlamp, footsteps on pavement",
                background="quiet Japanese residential street, traditional storefront with glowing signs, tangled overhead powerlines",
                depth_of_field="cinematic anamorphic lens flare from streetlamp, beautiful bokeh on distant taillights",
                camera_shot=camera_desc
            )
        elif "mind" in loc or "void" in loc or "nội tâm" in loc:
            return CompositionLayers(
                foreground="floating glowing stardust motes and soft pink sakura petals drifting across frame",
                midground="character standing in calm introspection, soft celestial rim lighting accentuating silhouette",
                background="infinite deep indigo anime cosmic void, subtle celestial orbital rings, distant shimmering galaxies",
                depth_of_field="ethereal dreamlike depth with soft bloom and luminous chromatic glow",
                camera_shot=camera_desc
            )
        else:
            return CompositionLayers(
                foreground="interior cozy architectural framing, edge of wooden shelf or window frame",
                midground="character engaged in narrative action, authentic anime proportions and natural gesture",
                background="richly detailed hand-painted Japanese interior, soft ambient window lighting",
                depth_of_field="balanced cinematic depth of field",
                camera_shot=camera_desc
            )
