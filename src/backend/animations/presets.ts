// ============================================================================
// DARKTOON AI — Dark Minimalist 2D Rig & Background Presets
// (src/backend/animations/presets.ts)
// ============================================================================

import type {
  BackgroundPreset,
  BackgroundPresetId,
  CharacterAction,
  CharacterColorPalette,
  CharacterExpression,
  CharacterProfile,
  SceneProp,
} from "../../types/darktoon.ts";

export const BACKGROUND_PRESETS: Record<BackgroundPresetId, BackgroundPreset> = {
  bg_living_room: {
    id: "bg_living_room",
    name: "Phòng khách tối (Dark Living Room)",
    category: "indoor",
    description: "Minimalist charcoal living room with low sofa, floor lamp, and dim blue-gray window shadow",
    primaryColor: "#0B0B0D",
    secondaryColor: "#16161C",
    accentGlow: "#3B82F6",
    defaultProps: ["sofa", "lamp", "window"],
  },
  bg_bedroom: {
    id: "bg_bedroom",
    name: "Phòng ngủ đêm (Night Bedroom)",
    category: "indoor",
    description: "Quiet dark bedroom with tall city window, moonlight rim, and minimal bed silhouette",
    primaryColor: "#09090C",
    secondaryColor: "#14141A",
    accentGlow: "#60A5FA",
    defaultProps: ["window", "bed", "smartphone"],
  },
  bg_desk_workspace: {
    id: "bg_desk_workspace",
    name: "Bàn làm việc khuya (Late Night Desk)",
    category: "indoor",
    description: "Isolated desk in a dark room illuminated only by a monitor/desk lamp cone",
    primaryColor: "#0A0A0D",
    secondaryColor: "#181820",
    accentGlow: "#38BDF8",
    defaultProps: ["desk", "lamp", "coffee_cup"],
  },
  bg_cafe: {
    id: "bg_cafe",
    name: "Góc quán cà phê (Quiet Cafe Corner)",
    category: "indoor",
    description: "Warm-dim minimalist cafe booth with pendant light and rain on glass",
    primaryColor: "#0D0C0E",
    secondaryColor: "#1B191E",
    accentGlow: "#F59E0B",
    defaultProps: ["coffee_cup", "window"],
  },
  bg_night_street: {
    id: "bg_night_street",
    name: "Đường phố đêm (Lonely Night Street)",
    category: "outdoor",
    description: "Long dark asphalt street with solitary streetlamp cone and distant city silhouettes",
    primaryColor: "#08080A",
    secondaryColor: "#121318",
    accentGlow: "#93C5FD",
    defaultProps: ["street_lamp", "rain"],
  },
  bg_park_bench: {
    id: "bg_park_bench",
    name: "Ghế đá công viên (Night Park Bench)",
    category: "outdoor",
    description: "Minimalist park bench under bare winter branches against a charcoal night sky",
    primaryColor: "#090A0D",
    secondaryColor: "#13151B",
    accentGlow: "#64748B",
    defaultProps: ["bench", "street_lamp"],
  },
  bg_bus_stop: {
    id: "bg_bus_stop",
    name: "Trạm xe buýt (Isolated Bus Stop)",
    category: "outdoor",
    description: "Flickering fluorescent bus shelter in the middle of an empty night road",
    primaryColor: "#0A0B0E",
    secondaryColor: "#151821",
    accentGlow: "#38BDF8",
    defaultProps: ["bench", "rain"],
  },
  bg_train_station: {
    id: "bg_train_station",
    name: "Sân ga đêm (Subway / Train Platform)",
    category: "outdoor",
    description: "Perspective platform lines with rhythmic pillars and distant signal red light",
    primaryColor: "#0A0A0C",
    secondaryColor: "#16161B",
    accentGlow: "#F04444",
    defaultProps: ["bench", "clock"],
  },
  bg_corridor: {
    id: "bg_corridor",
    name: "Hành lang sâu (Deep Perspective Corridor)",
    category: "indoor",
    description: "Long narrow hallway with doors and stark geometric shadow lines",
    primaryColor: "#09090B",
    secondaryColor: "#151519",
    accentGlow: "#E11D48",
    defaultProps: ["door"],
  },
  bg_office: {
    id: "bg_office",
    name: "Văn phòng tối giản (Minimalist Office)",
    category: "indoor",
    description: "Stark grid of empty desks and glass partitions at dusk",
    primaryColor: "#0B0C0F",
    secondaryColor: "#171920",
    accentGlow: "#94A3B8",
    defaultProps: ["desk", "clock"],
  },
  bg_mind_void: {
    id: "bg_mind_void",
    name: "Không gian tâm lý (Psychological Inner Void)",
    category: "symbolic",
    description: "Pure obsidian symbolic space with subtle floor reflection and crimson/blue psychological aura",
    primaryColor: "#050507",
    secondaryColor: "#111115",
    accentGlow: "#F04444",
    defaultProps: ["mirror"],
  },
};

export interface RigPoseTransforms {
  headRotate: number; // degrees
  headOffsetY: number;
  torsoRotate: number;
  torsoOffsetY: number;
  leftArmRotate: number;
  rightArmRotate: number;
  leftLegRotate: number;
  rightLegRotate: number;
  isSitting?: boolean;
  isLying?: boolean;
  holdingPhone?: boolean;
}

export function getRigPoseForAction(
  action: CharacterAction,
  timeSec: number = 0
): RigPoseTransforms {
  const phase = Math.sin(timeSec * 3.2);
  const fastPhase = Math.sin(timeSec * 7.5);
  const breathe = Math.sin(timeSec * 1.8) * 2;

  switch (action) {
    case "sitting":
      return {
        headRotate: 8 + Math.sin(timeSec * 1.2) * 2,
        headOffsetY: breathe,
        torsoRotate: 4,
        torsoOffsetY: 36,
        leftArmRotate: 25,
        rightArmRotate: -20,
        leftLegRotate: 75,
        rightLegRotate: -75,
        isSitting: true,
      };
    case "looking_down":
      return {
        headRotate: 24 + Math.sin(timeSec * 1.1) * 2,
        headOffsetY: 5 + breathe,
        torsoRotate: 6,
        torsoOffsetY: breathe,
        leftArmRotate: 12,
        rightArmRotate: -12,
        leftLegRotate: 2,
        rightLegRotate: -2,
      };
    case "looking_left_right":
      return {
        headRotate: Math.sin(timeSec * 2.2) * 18,
        headOffsetY: breathe,
        torsoRotate: Math.sin(timeSec * 1.1) * 3,
        torsoOffsetY: breathe,
        leftArmRotate: 14,
        rightArmRotate: -14,
        leftLegRotate: 3,
        rightLegRotate: -3,
      };
    case "turning_head":
      return {
        headRotate: -16 + Math.sin(timeSec * 1.5) * 10,
        headOffsetY: breathe,
        torsoRotate: -3,
        torsoOffsetY: breathe,
        leftArmRotate: 15,
        rightArmRotate: -15,
        leftLegRotate: 0,
        rightLegRotate: 0,
      };
    case "walking":
      return {
        headRotate: Math.sin(timeSec * 3.2) * 3,
        headOffsetY: Math.abs(phase) * -4,
        torsoRotate: 4,
        torsoOffsetY: Math.abs(phase) * -4,
        leftArmRotate: phase * 32,
        rightArmRotate: -phase * 32,
        leftLegRotate: -phase * 30,
        rightLegRotate: phase * 30,
      };
    case "running":
      return {
        headRotate: 8 + fastPhase * 4,
        headOffsetY: Math.abs(fastPhase) * -8,
        torsoRotate: 14,
        torsoOffsetY: Math.abs(fastPhase) * -8,
        leftArmRotate: fastPhase * 55,
        rightArmRotate: -fastPhase * 55,
        leftLegRotate: -fastPhase * 50,
        rightLegRotate: fastPhase * 50,
      };
    case "waving":
      return {
        headRotate: -4,
        headOffsetY: breathe,
        torsoRotate: 0,
        torsoOffsetY: breathe,
        leftArmRotate: 18,
        rightArmRotate: -135 + Math.sin(timeSec * 6) * 22,
        leftLegRotate: 3,
        rightLegRotate: -3,
      };
    case "holding_phone":
      return {
        headRotate: 16,
        headOffsetY: 2 + breathe,
        torsoRotate: 4,
        torsoOffsetY: breathe,
        leftArmRotate: 18,
        rightArmRotate: -68,
        leftLegRotate: 2,
        rightLegRotate: -2,
        holdingPhone: true,
      };
    case "using_phone":
      return {
        headRotate: 20,
        headOffsetY: 3 + breathe,
        torsoRotate: 5,
        torsoOffsetY: breathe,
        leftArmRotate: 42,
        rightArmRotate: -72 + Math.sin(timeSec * 5) * 4,
        leftLegRotate: 2,
        rightLegRotate: -2,
        holdingPhone: true,
      };
    case "opening_door":
      return {
        headRotate: 4,
        headOffsetY: breathe,
        torsoRotate: 6,
        torsoOffsetY: breathe,
        leftArmRotate: 15,
        rightArmRotate: -82 - Math.sin(timeSec * 2) * 12,
        leftLegRotate: 8,
        rightLegRotate: -8,
      };
    case "closing_door":
      return {
        headRotate: 10,
        headOffsetY: breathe,
        torsoRotate: -4,
        torsoOffsetY: breathe,
        leftArmRotate: 15,
        rightArmRotate: -55 + Math.sin(timeSec * 2) * 12,
        leftLegRotate: 4,
        rightLegRotate: -4,
      };
    case "lying_down":
      return {
        headRotate: -5,
        headOffsetY: 75,
        torsoRotate: -82,
        torsoOffsetY: 75,
        leftArmRotate: 10,
        rightArmRotate: -10,
        leftLegRotate: 5,
        rightLegRotate: -5,
        isLying: true,
      };
    case "falling":
      return {
        headRotate: -22,
        headOffsetY: Math.sin(timeSec * 4) * 10,
        torsoRotate: -35,
        torsoOffsetY: 12,
        leftArmRotate: 115 + phase * 18,
        rightArmRotate: -120 - phase * 18,
        leftLegRotate: 35,
        rightLegRotate: -45,
      };
    case "pointing":
      return {
        headRotate: 2,
        headOffsetY: breathe,
        torsoRotate: 3,
        torsoOffsetY: breathe,
        leftArmRotate: 16,
        rightArmRotate: -92,
        leftLegRotate: 4,
        rightLegRotate: -4,
      };
    case "talking":
      return {
        headRotate: Math.sin(timeSec * 2.6) * 5,
        headOffsetY: breathe,
        torsoRotate: Math.sin(timeSec * 1.5) * 2,
        torsoOffsetY: breathe,
        leftArmRotate: 20 + Math.sin(timeSec * 3.0) * 10,
        rightArmRotate: -28 - Math.cos(timeSec * 3.4) * 14,
        leftLegRotate: 3,
        rightLegRotate: -3,
      };
    case "standing":
    case "idle":
    default:
      return {
        headRotate: Math.sin(timeSec * 1.3) * 2,
        headOffsetY: breathe,
        torsoRotate: 0,
        torsoOffsetY: breathe,
        leftArmRotate: 14 + Math.sin(timeSec * 1.5) * 2,
        rightArmRotate: -14 - Math.sin(timeSec * 1.5) * 2,
        leftLegRotate: 3,
        rightLegRotate: -3,
      };
  }
}

export const DEFAULT_CHARACTER_PALETTES: Record<
  CharacterProfile["role"],
  CharacterColorPalette
> = {
  protagonist: {
    fill: "#F4F1EA", // Off-white / soft cream per PRD 2.1
    stroke: "#FFFFFF",
    accent: "#38BDF8",
    shadow: "#1E1E24",
  },
  deuteragonist: {
    fill: "#CBD5E1", // Cool pale gray per PRD 2.1
    stroke: "#E2E8F0",
    accent: "#94A3B8",
    shadow: "#18181D",
  },
  supporting: {
    fill: "#94A3B8",
    stroke: "#CBD5E1",
    accent: "#64748B",
    shadow: "#141418",
  },
  antagonist: {
    fill: "#121216", // Dark figure with crimson rim light per PRD 2.1
    stroke: "#F04444",
    accent: "#F04444",
    shadow: "#050507",
    rimLight: "#F04444",
  },
  shadow: {
    fill: "#09090C", // Psychological inner shadow with glowing red rim
    stroke: "#EF4444",
    accent: "#EF4444",
    shadow: "#000000",
    rimLight: "#F04444",
  },
};

/**
 * Generates a standalone Dark Minimalist 2D SVG string for a scene or character reference.
 * Used for both versioned SVG image assets and server-side frame synthesis.
 */
export function renderSceneSvgString(params: {
  width: number;
  height: number;
  backgroundId: BackgroundPresetId;
  characters: Array<{
    profile: CharacterProfile;
    action: CharacterAction;
    expression: CharacterExpression;
    position: "left" | "center" | "right" | "foreground" | "background";
  }>;
  props: SceneProp[];
  subtitleText?: string;
  cameraShot?: string;
  timeSec?: number;
  isMockBadge?: boolean;
}): string {
  const {
    width,
    height,
    backgroundId,
    characters,
    props,
    subtitleText,
    timeSec = 0.8,
  } = params;
  const bg = BACKGROUND_PRESETS[backgroundId] || BACKGROUND_PRESETS.bg_living_room;
  const floorY = Math.round(height * 0.78);

  const renderBackgroundDecor = () => {
    switch (backgroundId) {
      case "bg_living_room":
      case "bg_bedroom":
        return `
          <rect x="${width * 0.68}" y="${height * 0.14}" width="${width * 0.18}" height="${height * 0.34}" rx="4" fill="#0F172A" stroke="#292930" stroke-width="3"/>
          <line x1="${width * 0.77}" y1="${height * 0.14}" x2="${width * 0.77}" y2="${height * 0.48}" stroke="#292930" stroke-width="2"/>
          <line x1="${width * 0.68}" y1="${height * 0.31}" x2="${width * 0.86}" y2="${height * 0.31}" stroke="#292930" stroke-width="2"/>
          <circle cx="${width * 0.73}" cy="${height * 0.22}" r="14" fill="${bg.accentGlow}" opacity="0.22"/>
        `;
      case "bg_night_street":
      case "bg_bus_stop":
      case "bg_park_bench":
        return `
          <line x1="${width * 0.24}" y1="${height * 0.18}" x2="${width * 0.24}" y2="${floorY}" stroke="#2E323B" stroke-width="6"/>
          <path d="M ${width * 0.24} ${height * 0.18} Q ${width * 0.28} ${height * 0.15} ${width * 0.31} ${height * 0.19}" fill="none" stroke="#3F4451" stroke-width="5"/>
          <polygon points="${width * 0.31},${height * 0.19} ${width * 0.12},${floorY} ${width * 0.50},${floorY}" fill="${bg.accentGlow}" opacity="0.09"/>
          <ellipse cx="${width * 0.31}" cy="${height * 0.19}" rx="14" ry="6" fill="#E0F2FE" opacity="0.85"/>
        `;
      case "bg_mind_void":
        return `
          <circle cx="${width * 0.5}" cy="${height * 0.45}" r="${Math.min(width, height) * 0.28}" fill="none" stroke="#F04444" stroke-width="1.5" opacity="0.28" stroke-dasharray="8 6"/>
          <ellipse cx="${width * 0.5}" cy="${floorY}" rx="${width * 0.28}" ry="18" fill="#F04444" opacity="0.08"/>
        `;
      default:
        return `
          <line x1="${width * 0.15}" y1="${height * 0.2}" x2="${width * 0.15}" y2="${floorY}" stroke="#22222A" stroke-width="2"/>
          <line x1="${width * 0.85}" y1="${height * 0.2}" x2="${width * 0.85}" y2="${floorY}" stroke="#22222A" stroke-width="2"/>
        `;
    }
  };

  const renderPropsSvg = () => {
    return props
      .map((prop) => {
        const px =
          prop.position === "left"
            ? width * 0.28
            : prop.position === "right"
            ? width * 0.72
            : width * 0.5;
        if (prop.type === "sofa" || prop.type === "bench") {
          return `
            <g transform="translate(${px - 150}, ${floorY - 75})">
              <rect x="0" y="10" width="300" height="55" rx="12" fill="#181820" stroke="#2E2E38" stroke-width="2.5"/>
              <rect x="14" y="38" width="272" height="32" rx="8" fill="#20202A" stroke="#343442" stroke-width="2"/>
              <rect x="-8" y="24" width="26" height="46" rx="8" fill="#1B1B24" stroke="#2E2E38" stroke-width="2"/>
              <rect x="282" y="24" width="26" height="46" rx="8" fill="#1B1B24" stroke="#2E2E38" stroke-width="2"/>
            </g>
          `;
        }
        if (prop.type === "desk") {
          return `
            <g transform="translate(${px - 120}, ${floorY - 82})">
              <rect x="0" y="30" width="240" height="10" rx="3" fill="#23232E" stroke="#383846" stroke-width="2"/>
              <line x1="20" y1="40" x2="20" y2="82" stroke="#23232E" stroke-width="6"/>
              <line x1="220" y1="40" x2="220" y2="82" stroke="#23232E" stroke-width="6"/>
              <rect x="85" y="-12" width="70" height="42" rx="4" fill="#111827" stroke="#38BDF8" stroke-width="1.5"/>
            </g>
          `;
        }
        if (prop.type === "rain") {
          return `
            <g stroke="#64748B" stroke-width="1.2" opacity="0.32">
              <line x1="${width * 0.2}" y1="${height * 0.1}" x2="${width * 0.17}" y2="${height * 0.28}"/>
              <line x1="${width * 0.45}" y1="${height * 0.18}" x2="${width * 0.42}" y2="${height * 0.36}"/>
              <line x1="${width * 0.65}" y1="${height * 0.12}" x2="${width * 0.62}" y2="${height * 0.30}"/>
              <line x1="${width * 0.82}" y1="${height * 0.22}" x2="${width * 0.79}" y2="${height * 0.40}"/>
            </g>
          `;
        }
        return "";
      })
      .join("\n");
  };

  const renderCharacterRigSvg = (
    charItem: {
      profile: CharacterProfile;
      action: CharacterAction;
      expression: CharacterExpression;
      position: "left" | "center" | "right" | "foreground" | "background";
    },
    idx: number
  ) => {
    const { profile, action, expression, position } = charItem;
    const pose = getRigPoseForAction(action, timeSec + idx * 0.5);
    const palette = profile.color_palette || DEFAULT_CHARACTER_PALETTES.protagonist;

    const cx =
      position === "left"
        ? width * 0.33
        : position === "right"
        ? width * 0.67
        : position === "background"
        ? width * 0.58
        : width * 0.5;
    const scale =
      position === "background"
        ? 0.78
        : position === "foreground"
        ? 1.12
        : 1.0;

    const baseY = floorY - 125 * scale + pose.torsoOffsetY * 0.45;

    // Expression geometry for eyes & mouth
    let eyesSvg = `<circle cx="-11" cy="-4" r="3.2" fill="${palette.shadow}"/><circle cx="11" cy="-4" r="3.2" fill="${palette.shadow}"/>`;
    let browsSvg = "";
    let mouthSvg = `<line x1="-7" y1="11" x2="7" y2="11" stroke="${palette.shadow}" stroke-width="2.4" stroke-linecap="round"/>`;
    let extraFaceSvg = "";

    switch (expression) {
      case "sad":
        browsSvg = `<line x1="-16" y1="-10" x2="-6" y2="-13" stroke="${palette.shadow}" stroke-width="2.2" stroke-linecap="round"/><line x1="6" y1="-13" x2="16" y2="-10" stroke="${palette.shadow}" stroke-width="2.2" stroke-linecap="round"/>`;
        mouthSvg = `<path d="M -8 14 Q 0 8 8 14" fill="none" stroke="${palette.shadow}" stroke-width="2.4" stroke-linecap="round"/>`;
        break;
      case "crying":
        browsSvg = `<line x1="-16" y1="-10" x2="-6" y2="-13" stroke="${palette.shadow}" stroke-width="2.2"/><line x1="6" y1="-13" x2="16" y2="-10" stroke="${palette.shadow}" stroke-width="2.2"/>`;
        mouthSvg = `<path d="M -8 14 Q 0 7 8 14" fill="none" stroke="${palette.shadow}" stroke-width="2.4"/>`;
        extraFaceSvg = `<path d="M -11 0 L -11 12 M 11 0 L 11 12" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/>`;
        break;
      case "happy":
        mouthSvg = `<path d="M -9 9 Q 0 17 9 9" fill="none" stroke="${palette.shadow}" stroke-width="2.4" stroke-linecap="round"/>`;
        break;
      case "angry":
        browsSvg = `<line x1="-16" y1="-13" x2="-5" y2="-8" stroke="${palette.shadow}" stroke-width="2.6" stroke-linecap="round"/><line x1="5" y1="-8" x2="16" y2="-13" stroke="${palette.shadow}" stroke-width="2.6" stroke-linecap="round"/>`;
        mouthSvg = `<line x1="-8" y1="13" x2="8" y2="11" stroke="${palette.shadow}" stroke-width="2.6" stroke-linecap="round"/>`;
        break;
      case "surprised":
        eyesSvg = `<circle cx="-11" cy="-4" r="4.2" fill="${palette.shadow}"/><circle cx="11" cy="-4" r="4.2" fill="${palette.shadow}"/>`;
        mouthSvg = `<circle cx="0" cy="12" r="4.5" fill="${palette.shadow}"/>`;
        break;
      case "tired":
        eyesSvg = `<line x1="-15" y1="-4" x2="-7" y2="-4" stroke="${palette.shadow}" stroke-width="2.4" stroke-linecap="round"/><line x1="7" y1="-4" x2="15" y2="-4" stroke="${palette.shadow}" stroke-width="2.4" stroke-linecap="round"/>`;
        mouthSvg = `<line x1="-6" y1="12" x2="5" y2="12" stroke="${palette.shadow}" stroke-width="2" stroke-linecap="round"/>`;
        break;
      case "worried":
      case "confused":
      case "thinking":
        browsSvg = `<line x1="-15" y1="-11" x2="-6" y2="-13" stroke="${palette.shadow}" stroke-width="2.2"/><line x1="6" y1="-12" x2="15" y2="-12" stroke="${palette.shadow}" stroke-width="2.2"/>`;
        mouthSvg = `<path d="M -7 12 Q -2 10 6 13" fill="none" stroke="${palette.shadow}" stroke-width="2.2" stroke-linecap="round"/>`;
        break;
    }

    const phoneSvg =
      pose.holdingPhone || action === "holding_phone" || action === "using_phone"
        ? `<rect x="26" y="-8" width="12" height="20" rx="2.5" fill="#0F172A" stroke="#38BDF8" stroke-width="1.6"/>`
        : "";

    return `
      <g transform="translate(${cx}, ${baseY}) scale(${scale})">
        <!-- Character Floor Shadow -->
        <ellipse cx="0" cy="126" rx="42" ry="9" fill="#000000" opacity="0.55"/>
        <!-- 8-Part Articulated Rig -->
        <!-- Left Leg -->
        <g transform="translate(-12, 52) rotate(${pose.leftLegRotate})">
          <rect x="-6" y="0" width="12" height="68" rx="6" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2"/>
        </g>
        <!-- Right Leg -->
        <g transform="translate(12, 52) rotate(${pose.rightLegRotate})">
          <rect x="-6" y="0" width="12" height="68" rx="6" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2"/>
        </g>
        <!-- Body / Torso -->
        <g transform="rotate(${pose.torsoRotate})">
          <rect x="-24" y="-22" width="48" height="80" rx="22" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2.4"/>
          <!-- Left Arm -->
          <g transform="translate(-24, -12) rotate(${pose.leftArmRotate})">
            <rect x="-6" y="0" width="12" height="58" rx="6" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2"/>
          </g>
          <!-- Right Arm -->
          <g transform="translate(24, -12) rotate(${pose.rightArmRotate})">
            <rect x="-6" y="0" width="12" height="58" rx="6" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2"/>
            ${phoneSvg}
          </g>
          <!-- Head + Eyes + Mouth -->
          <g transform="translate(0, ${-56 + pose.headOffsetY}) rotate(${pose.headRotate})">
            <circle cx="0" cy="0" r="32" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2.6"/>
            ${browsSvg}
            ${eyesSvg}
            ${mouthSvg}
            ${extraFaceSvg}
          </g>
        </g>
      </g>
    `;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <radialGradient id="sceneGlow" cx="50%" cy="42%" r="65%">
        <stop offset="0%" stop-color="${bg.secondaryColor}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${bg.primaryColor}" stop-opacity="1"/>
      </radialGradient>
      <radialGradient id="accentSpot" cx="50%" cy="30%" r="45%">
        <stop offset="0%" stop-color="${bg.accentGlow}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${bg.accentGlow}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <!-- Main Dark Minimalist Background -->
    <rect width="${width}" height="${height}" fill="url(#sceneGlow)"/>
    <rect width="${width}" height="${height}" fill="url(#accentSpot)"/>
    <!-- Horizon / Floor Plane -->
    <rect x="0" y="${floorY}" width="${width}" height="${height - floorY}" fill="#070709"/>
    <line x1="0" y1="${floorY}" x2="${width}" y2="${floorY}" stroke="#262630" stroke-width="2"/>
    ${renderBackgroundDecor()}
    ${renderPropsSvg()}
    ${characters.map((c, idx) => renderCharacterRigSvg(c, idx)).join("\n")}
    ${
      subtitleText
        ? `<g transform="translate(${width * 0.5}, ${height - 52})">
            <rect x="${-Math.min(width * 0.42, subtitleText.length * 6.5 + 32)}" y="-24" width="${Math.min(
            width * 0.84,
            subtitleText.length * 13 + 64
          )}" height="42" rx="8" fill="#0B0B0D" opacity="0.82" stroke="#292930" stroke-width="1"/>
            <text x="0" y="3" text-anchor="middle" fill="#F5F5F5" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="500">${subtitleText
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</text>
          </g>`
        : ""
    }
  </svg>`;
}
