"""DARKTOON AI - Anime Scene Analyzer Module
Phân tích lời thoại audio thành các phân cảnh điện ảnh 3-8 giây bằng Gemini (hoặc heuristic dự phòng)
"""

import json
import os
import re
from typing import Dict, Any, List, Optional


class AnimeSceneAnalyzer:
    """Chia kịch bản thoại thành các cảnh điện ảnh giàu hình ảnh theo phong cách Anime Nhật Bản"""

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.5-flash"):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.model = model
        self.client = None

        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                # Fallback to google.generativeai if available
                try:
                    import google.generativeai as gai
                    gai.configure(api_key=self.api_key)
                    self.client = gai.GenerativeModel(self.model)
                except Exception:
                    self.client = None

    def analyze_transcript(self, transcript: str, total_duration_sec: float = 65.0) -> Dict[str, Any]:
        """Phân tích văn bản thành các cảnh visual. Nếu có API key gọi Gemini, nếu không dùng heuristic chuẩn."""
        if self.client and self.api_key:
            try:
                return self._call_gemini_director(transcript, total_duration_sec)
            except Exception as err:
                print(f"[AnimeSceneAnalyzer] Gemini API failed ({err}), switching to cinematic heuristic pipeline.")

        return self._heuristic_cinematic_split(transcript, total_duration_sec)

    def _call_gemini_director(self, transcript: str, total_duration_sec: float) -> Dict[str, Any]:
        prompt = f"""You are a Japanese anime film storyboard director (in the style of Makoto Shinkai's Kimi No Na Wa and CoMix Wave Films).
Analyze this Vietnamese podcast narration and divide it into visual scenes. Total audio length is {total_duration_sec:.1f} seconds.

NARRATION:
{transcript}

Return valid JSON ONLY (no markdown formatting, no commentary):
{{
  "scenes": [
    {{
      "sequence_index": 1,
      "narration": "exact spoken segment for this short shot (1-2 sentences)",
      "visual_description": "detailed hand-painted anime visual description",
      "location": "specific Japanese location (e.g. cozy desk studio with window, sunset balcony, rain-soaked street with streetlamp)",
      "characters": ["Hu"],
      "action": "specific concrete physical action (e.g. sitting, turning_head, walking, holding_cup)",
      "emotion": "happy, thinking, sad, tired, neutral",
      "camera": "wide, medium, closeup, low, high, tracking",
      "lighting": "volumetric sunset, amber streetlamp cone, warm desk lamp, stardust glow",
      "time_of_day": "sunset, night, afternoon, dusk",
      "weather": "clear, autumn_breeze, rain, clear_night",
      "transition": "fade or dissolve"
    }}
  ]
}}

STRICT STORYBOARD RULES:
1. Each scene must represent ONE clear, poignant visual concept lasting 3-8 seconds.
2. Chronological order must match the narration exactly.
3. Every scene must describe concrete foreground, midground, and background anime elements.
4. Camera shots must be diverse: wide establishing shot, medium storytelling, emotional closeup, and dynamic tracking.
5. No text, subtitles, or UI inside the visual description."""

        # Support both google.genai and google.generativeai
        if hasattr(self.client, "models"):
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            raw = response.text.strip()
        else:
            response = self.client.generate_content(prompt)
            raw = response.text.strip()

        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)

    def _heuristic_cinematic_split(self, transcript: str, total_duration_sec: float) -> Dict[str, Any]:
        """Bộ phân tích thông minh chia câu ngắn và ghép bối cảnh chuẩn điện ảnh khi chạy offline / dev mode"""
        raw_sentences = [
            s.strip()
            for s in re.split(r"(?<=[.?!;])\s+|\n+", transcript)
            if s.strip()
        ]
        if not raw_sentences:
            raw_sentences = [transcript.strip()]

        scenes: List[Dict[str, Any]] = []
        num_scenes = min(6, max(3, len(raw_sentences)))
        step = max(1, len(raw_sentences) // num_scenes)

        grouped_sents: List[str] = []
        for i in range(0, len(raw_sentences), step):
            group = " ".join(raw_sentences[i:i + step])
            grouped_sents.append(group)
            if len(grouped_sents) >= num_scenes:
                if i + step < len(raw_sentences):
                    grouped_sents[-1] += " " + " ".join(raw_sentences[i + step:])
                break

        slot_dur = total_duration_sec / len(grouped_sents)

        # Mẫu 5 phân cảnh anime chuẩn Makoto Shinkai
        anime_templates = [
            {
                "location": "Lofi Anime Desk Workspace with window overlooking evening city",
                "action": "sitting",
                "emotion": "happy",
                "camera": "medium",
                "lighting": "warm amber desk lamp cone, glowing laptop waveform, soft ambient twilight",
                "time_of_day": "dusk",
                "weather": "clear",
                "desc": "Anime protagonist Hu sitting at a wooden studio desk with over-ear headphones, calm gentle smile, steaming tea mug beside podcast microphone."
            },
            {
                "location": "Makoto Shinkai Sunset Balcony with view of Tokyo skyline",
                "action": "turning_head",
                "emotion": "thinking",
                "camera": "wide",
                "lighting": "blazing golden hour sunset, volumetric god rays through towering cumulus clouds",
                "time_of_day": "sunset",
                "weather": "autumn_breeze",
                "desc": "Wide panoramic balcony shot, autumn twilight wind gently blowing bangs and hoodie drawstrings, distant radio tower with blinking red beacon."
            },
            {
                "location": "Rain-slicked Japanese City Street with vintage bicycle and amber streetlamp",
                "action": "walking",
                "emotion": "sad",
                "camera": "tracking",
                "lighting": "curved sodium streetlamp casting warm golden circle on wet reflective asphalt puddles",
                "time_of_day": "night",
                "weather": "clear_night",
                "desc": "Tracking cinematic composition of Hu walking along quiet evening sidewalk under luminous streetlamp, glowing neon cafe sign in background."
            },
            {
                "location": "Cozy Living Room Window overlooking rainy evening street with blurred taillights",
                "action": "looking_down",
                "emotion": "tired",
                "camera": "closeup",
                "lighting": "soft diffused interior light, colorful bokeh of car headlights reflected on rain droplets",
                "time_of_day": "night",
                "weather": "rain",
                "desc": "Emotional close-up portrait, shallow depth of field, rain droplets streaking across windowpane, expressive reflective eyes."
            },
            {
                "location": "Celestial Cosmic Anime Void with drifting sakura petals and glowing orbital runes",
                "action": "standing",
                "emotion": "neutral",
                "camera": "wide",
                "lighting": "deep celestial navy void, ethereal pink and violet stardust glow",
                "time_of_day": "midnight",
                "weather": "clear",
                "desc": "Stardust serenity aesthetic, infinite starry sky, floating glowing petals, silhouette standing in tranquil emotional acceptance."
            }
        ]

        for idx, text in enumerate(grouped_sents):
            tmpl = anime_templates[idx % len(anime_templates)]
            scenes.append({
                "sequence_index": idx + 1,
                "narration": text,
                "start_time": round(idx * slot_dur, 2),
                "end_time": round((idx + 1) * slot_dur, 2),
                "duration": round(slot_dur, 2),
                "visual_description": tmpl["desc"],
                "location": tmpl["location"],
                "characters": ["Hu"],
                "action": tmpl["action"],
                "emotion": tmpl["emotion"],
                "camera": tmpl["camera"],
                "lighting": tmpl["lighting"],
                "time_of_day": tmpl["time_of_day"],
                "weather": tmpl["weather"],
                "transition": "dissolve" if idx < len(grouped_sents) - 1 else "fade"
            })

        return {"scenes": scenes, "total_duration": total_duration_sec, "is_mock": not bool(self.api_key)}
