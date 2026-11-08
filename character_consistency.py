"""DARKTOON AI - Character Consistency & Identity Lock Engine
Khóa cố định nhận dạng nhân vật (Visual DNA) xuyên suốt toàn bộ các phân cảnh
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class CharacterDNA:
    id: str
    name: str
    archetype: str
    age_appearance: str
    hair: str
    face_and_eyes: str
    attire: str
    accessories: str
    color_palette: str
    seed: int = 42

    def to_anchor_prompt(self) -> str:
        """Chuỗi mô tả nhân vật bắt buộc phải có trong mọi prompt để model AI giữ nguyên diện mạo"""
        return (
            f"CHARACTER ANCHOR [{self.name}]: single recurring anime protagonist, {self.age_appearance}, "
            f"{self.hair}, {self.face_and_eyes}, wearing {self.attire}, {self.accessories}, "
            f"color palette {self.color_palette}. Strict visual identity lock: identical facial structure, "
            f"same hairstyle and clothing across all frames."
        )

    def get_negative_rules(self) -> str:
        return (
            f"different outfit for {self.name}, changing hairstyles, changing eye color, "
            f"multiple people instead of {self.name}, realistic human face, 3d CGI face, "
            f"deformed face, asymmetry, extra ears, missing headphones"
        )


class CharacterConsistencyEngine:
    """Quản lý thư viện nhân vật đã khóa cho Darktoon AI"""

    def __init__(self):
        self._registry: Dict[str, CharacterDNA] = {}
        self._register_defaults()

    def _register_defaults(self):
        # Nhân vật chính: Hu (Host podcast tự sự phong cách Lofi/Anime)
        self.register_character(
            CharacterDNA(
                id="char_hu_protagonist",
                name="Hu",
                archetype="Reflective Podcast Storyteller (Makoto Shinkai / Lofi aesthetic)",
                age_appearance="young female anime storyteller, early 20s",
                hair="dark raven-black messy-cute shoulder-length hair with soft side-swept anime bangs and a luminous angel-ring shine halo",
                face_and_eyes="tapered soft jawline, gentle blushing cheeks, expressive deep celestial indigo-blue eyes with dual sparkling catchlights",
                attire="oversized dark charcoal hoodie with clean drawstrings and white inner cuffs",
                accessories="sleek matte dark-grey studio over-ear headphones resting comfortably over ears, red-lit studio mic nearby",
                color_palette="off-white ivory skin #FFF3EB, deep charcoal hoodie #1C1E2B, indigo iris #312E81 to #6366F1, subtle peach blush #FB7185",
                seed=88977
            )
        )

        # Nhân vật đồng hành / Thính giả tưởng tượng
        self.register_character(
            CharacterDNA(
                id="char_companion",
                name="Companion Friend",
                archetype="Silent Empathetic Companion",
                age_appearance="young anime companion, calm demeanor",
                hair="soft ash-brown cropped hair with natural parting",
                face_and_eyes="warm contemplative hazel eyes, gentle comforting smile",
                attire="warm cream-colored knit cardigan over navy button-up shirt",
                accessories="warm wool scarf loosely draped around neck",
                color_palette="slate grey #94A3B8, warm cream #FEF3C7, navy #1E293B",
                seed=88978
            )
        )

    def register_character(self, character: CharacterDNA):
        self._registry[character.id] = character
        self._registry[character.name.lower()] = character

    def get_character(self, char_id_or_name: str) -> Optional[CharacterDNA]:
        key = char_id_or_name.strip().lower()
        if key in self._registry:
            return self._registry[key]
        # Tìm gần đúng
        for k, v in self._registry.items():
            if k in key or key in k:
                return v
        return self._registry.get("char_hu_protagonist")

    def build_character_prompt_clause(self, character_names: List[str]) -> str:
        if not character_names:
            hu = self._registry["char_hu_protagonist"]
            return hu.to_anchor_prompt()

        clauses = []
        for name in character_names:
            char = self.get_character(name)
            if char:
                clauses.append(char.to_anchor_prompt())
        return " | ".join(clauses) if clauses else self._registry["char_hu_protagonist"].to_anchor_prompt()


CHARACTER_ENGINE = CharacterConsistencyEngine()
