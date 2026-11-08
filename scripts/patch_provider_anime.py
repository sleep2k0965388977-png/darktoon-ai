import os

path = "src/backend/providers/providerRegistry.ts"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add buildCinematicAnimePrompt function
director_func = """// ============================================================================
// JAPANESE ANIME CINEMATIC ENGINE 2.0 — PROMPT DIRECTOR
// ============================================================================
export function buildCinematicAnimePrompt(params: {
  narration: string;
  characterName: string;
  locationDesc: string;
  action: string;
  emotion: string;
  cameraShot: string;
  cameraMovement: string;
}): { prompt: string; negativePrompt: string } {
  const characterAnchor = `CHARACTER ANCHOR [${params.characterName}]: single recurring anime protagonist, young female anime storyteller, early 20s, dark raven-black messy-cute shoulder-length hair with soft side-swept anime bangs and a luminous angel-ring shine halo, tapered soft jawline, gentle blushing cheeks, expressive deep celestial indigo-blue eyes with dual sparkling catchlights, wearing oversized dark charcoal hoodie with clean drawstrings and white inner cuffs, sleek matte dark-grey studio over-ear headphones resting comfortably over ears, red-lit studio mic nearby, color palette off-white ivory skin #FFF3EB, deep charcoal hoodie #1C1E2B, indigo iris #312E81 to #6366F1, subtle peach blush #FB7185. Strict visual identity lock: identical facial structure, same hairstyle and clothing across all frames.`;

  const visualStyle = `masterpiece, premium Japanese animated feature film aesthetic, Makoto Shinkai and Kimi No Na Wa inspired background art, highly detailed hand-painted environmental textures, beautiful atmospheric perspective, expressive anime character design, rich environmental storytelling, cinematic natural lighting, volumetric crepuscular rays, sunlight breaking through clouds, soft global illumination, realistic bounce light, delicate golden hour rim lighting, detailed ambient occlusion and shadows, intricate Japanese background details, layered cumulus clouds with silver linings, luminous gradient twilight and sunset sky, realistic wet asphalt puddles reflecting city lights, atmospheric depth, carefully painted Japanese architectural scenery, vibrant yet balanced cinematic color grading, deep celestial indigo, luminous golden amber, warm sunlight highlights, rich natural foliage and clean anime shading, professional cinematic composition, clear foreground midground background layer separation, strong visual leading lines, golden ratio framing, rule of thirds, atmospheric haze`;

  const prompt = `SCENE CONTENT: ${params.narration}
LOCATION & ENVIRONMENT: ${params.locationDesc}
${characterAnchor}
ACTION & INTERACTION: ${params.action}
FACIAL EMOTION & EXPRESSION: ${params.emotion}
CAMERA: ${params.cameraShot.toUpperCase()} (${params.cameraMovement})
VISUAL STYLE: ${visualStyle}

MANDATORY CINEMATIC DIRECTIVES:
- Illustrate the exact narrative meaning of the spoken line.
- Show the described action concretely, avoid generic unrelated filler imagery.
- Strictly adhere to the Character Anchor: identical hairstyle, face shape, and dark hoodie.
- Complete three-dimensional hand-painted anime environment with foreground, midground, and background separation.
- Rich Makoto Shinkai color gradients, luminous sky, delicate rim light, and soft contact shadows.
- Absolutely NO subtitles, NO floating letters, NO watermarks, NO UI elements inside the generated image.`;

  const negativePrompt = `low quality, blurry, pixelated, flat lighting, 3d render, generic background, empty environment, poor anatomy, deformed hands, extra fingers, missing limbs, duplicate characters, inconsistent clothing, random floating objects, subtitles, text, watermark, logo, signature, different outfit for ${params.characterName}, changing hairstyles, changing eye color, multiple people instead of ${params.characterName}, realistic human face, 3d CGI face, deformed face, asymmetry, extra ears, missing headphones`;

  return { prompt: prompt.trim(), negativePrompt };
}

"""

anchor_class = "export class ConfigurableLLMProvider implements LLMProvider {"
if "export function buildCinematicAnimePrompt" not in text:
    text = text.replace(anchor_class, director_func + anchor_class, 1)

# 2. Upgrade the scene prompt creation in planStoryboard
old_prompt_block = """        image_prompt: `Dark minimalist 2D animation, rounded white minimalist figure (${
          mainChar?.name || "Protagonist"
        }) ${sem.action} in ${bgPreset.description}, charcoal and #0B0B0D palette, selective rim light, clean outlines, no text.`,
        motion_prompt: `Character performs ${sem.action} with ${seg.emotion} expression, subtle breathing, camera ${sem.cameraMovement}.`,
        negative_prompt:
          "No additional characters, no realistic human face, no 3D style, no anime style, no random text, no watermark, no character redesign.","""

new_prompt_block = """        image_prompt: buildCinematicAnimePrompt({
          narration: seg.text,
          characterName: mainChar?.name || "Hu",
          locationDesc: bgPreset.description,
          action: sem.action,
          emotion: seg.emotion,
          cameraShot: sem.cameraShot,
          cameraMovement: sem.cameraMovement,
        }).prompt,
        motion_prompt: `Character performs ${sem.action} with ${seg.emotion} expression, subtle breathing, camera ${sem.cameraMovement}.`,
        negative_prompt: buildCinematicAnimePrompt({
          narration: seg.text,
          characterName: mainChar?.name || "Hu",
          locationDesc: bgPreset.description,
          action: sem.action,
          emotion: seg.emotion,
          cameraShot: sem.cameraShot,
          cameraMovement: sem.cameraMovement,
        }).negativePrompt,"""

# Normalize newlines
text = text.replace("\r\n", "\n")
old_prompt_block = old_prompt_block.replace("\r\n", "\n")
new_prompt_block = new_prompt_block.replace("\r\n", "\n")

if old_prompt_block in text:
    text = text.replace(old_prompt_block, new_prompt_block, 1)
    print("Replaced old prompt block successfully!")
else:
    print("Warning: old prompt block not found, checking alternatives...")

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated providerRegistry.ts successfully!")
