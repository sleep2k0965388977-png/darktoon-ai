"""DARKTOON AI - Character Consistency & Identity Lock Engine
Khóa cố định nhận dạng nhân vật (Visual DNA) xuyên suốt toàn bộ các phân cảnh.
Hỗ trợ mọi nhân vật tùy biến theo dự án, KHÔNG mặc định áp đặt hoodie hay headphone.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import re


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
        accessories_clause = f", accessories: {self.accessories}" if self.accessories else ""
        return (
            f"CHARACTER ANCHOR [{self.name}]: recurring anime character, {self.age_appearance}, "
            f"hair: {self.hair}, face: {self.face_and_eyes}, attire: {self.attire}{accessories_clause}, "
            f"color palette: {self.color_palette}. Strict visual identity lock: identical facial structure, "
            f"same hairstyle and exact clothing across all frames."
        )

    def get_negative_rules(self) -> str:
        return (
            f"different outfit for {self.name}, changing hairstyles, changing eye color, "
            f"swapped clothes for {self.name}, deformed face, asymmetry, extra limbs"
        )


class CharacterConsistencyEngine:
    """Quản lý thư viện nhân vật đã khóa cho Darktoon AI"""

    def __init__(self):
        self._registry: Dict[str, CharacterDNA] = {}
        self._register_defaults()

    def _register_defaults(self):
        # 1. Nhân vật Hu (Podcast Lofi - chỉ dùng khi dự án podcast chọn)
        self.register_character(
            CharacterDNA(
                id="char_hu_protagonist",
                name="Hu",
                archetype="Podcast Storyteller",
                age_appearance="young female anime storyteller, early 20s",
                hair="dark raven-black messy-cute shoulder-length hair with soft side-swept anime bangs and a luminous angel-ring shine halo",
                face_and_eyes="tapered soft jawline, gentle blushing cheeks, expressive deep celestial indigo-blue eyes with dual sparkling catchlights",
                attire="oversized dark charcoal hoodie with clean drawstrings and white inner cuffs",
                accessories="sleek matte dark-grey studio over-ear headphones resting comfortably over ears",
                color_palette="off-white ivory skin #FFF3EB, deep charcoal hoodie #1C1E2B, indigo iris #312E81 to #6366F1",
                seed=88977
            )
        )

        # 2. Nhân vật A: Nam tóc đen, áo sơ mi trắng (Validation Requirement)
        self.register_character(
            CharacterDNA(
                id="char_male_white_shirt",
                name="Nhân vật A",
                archetype="Young Anime Male Protagonist",
                age_appearance="young anime male, early 20s, tall lean build",
                hair="neatly styled short straight black hair with natural side parting",
                face_and_eyes="sharp jawline, focused dark brown expressive eyes, calm contemplative expression",
                attire="crisp buttoned white long-sleeve dress shirt, tailored dark charcoal trousers",
                accessories="vintage minimalist wristwatch on left wrist",
                color_palette="crisp white #FFFFFF, dark charcoal trousers #1E202C, dark brown eyes #2C1810",
                seed=10001
            )
        )

        # 3. Nhân vật B: Nữ tóc dài màu nâu, váy xanh (Validation Requirement)
        self.register_character(
            CharacterDNA(
                id="char_female_blue_dress",
                name="Nhân vật B",
                archetype="Young Anime Female Protagonist",
                age_appearance="young anime female, early 20s, graceful posture",
                hair="long flowing chestnut-brown hair gently swaying past shoulders with soft straight bangs",
                face_and_eyes="gentle oval face, warm amber-brown radiant eyes with soft eyelashes, warm friendly smile",
                attire="elegant pastel cerulean-blue pleated summer dress with white lace hemline collar",
                accessories="small silver pendant necklace",
                color_palette="cerulean blue #38BDF8, chestnut brown #5C3826, warm amber eyes #92400E",
                seed=10002
            )
        )

    def register_character(self, character: CharacterDNA):
        self._registry[character.id] = character
        self._registry[character.name.strip().lower()] = character

    def get_character(self, char_id_or_name: str) -> CharacterDNA:
        key = char_id_or_name.strip().lower()
        if key in self._registry:
            return self._registry[key]
        for k, v in self._registry.items():
            if k in key or key in k:
                return v

        # Nếu là nhân vật mới chưa đăng ký, tự động phân tích và tạo DNA chuẩn thay vì ép về Hu
        return self._create_dynamic_character(char_id_or_name)

    def _create_dynamic_character(self, desc_or_name: str) -> CharacterDNA:
        clean_name = re.sub(r"[:\-,].*$", "", desc_or_name).strip() or "Character"
        lower = desc_or_name.lower()

        is_male = any(w in lower for w in ["nam", "chàng trai", "cậu", "boy", "man", "male"])
        hair_color = "black" if "đen" in lower else "brown" if "nâu" in lower else "dark"
        attire = "white shirt and dark trousers" if "sơ mi" in lower or "trắng" in lower else "casual anime clothing"
        if "váy" in lower or "dress" in lower:
            attire = "elegant blue dress" if "xanh" in lower else "casual dress"

        dna = CharacterDNA(
            id=f"char_dyn_{abs(hash(desc_or_name)) % 100000}",
            name=clean_name,
            archetype="Custom Anime Story Character",
            age_appearance="young anime character, early 20s" if not is_male else "young anime male, early 20s",
            hair=f"{hair_color} anime hair styled naturally",
            face_and_eyes="expressive anime eyes, clean facial contours",
            attire=attire,
            accessories="none",
            color_palette="harmonious anime cinematic palette",
            seed=abs(hash(desc_or_name)) % 100000
        )
        self.register_character(dna)
        return dna

    def build_character_prompt_clause(self, character_names: List[str]) -> str:
        if not character_names:
            return ""

        clauses = []
        for name in character_names:
            char = self.get_character(name)
            if char:
                clauses.append(char.to_anchor_prompt())
        return " | ".join(clauses)


CHARACTER_ENGINE = CharacterConsistencyEngine()
