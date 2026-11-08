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
        headRotate: 6 + Math.sin(timeSec * 1.2) * 2,
        headOffsetY: breathe,
        torsoRotate: 2,
        torsoOffsetY: 26,
        leftArmRotate: 18,
        rightArmRotate: -16,
        leftLegRotate: 8,
        rightLegRotate: -6,
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

    const isSitting = action === "sitting" || pose.isSitting;
    const baseY = isSitting
      ? floorY - 105 * scale + pose.torsoOffsetY * 0.3
      : floorY - 122 * scale + pose.torsoOffsetY * 0.42;

    // Expression geometry for eyes & mouth
    let eyesSvg = `
      <g transform="translate(-10, -2)">
        <ellipse cx="0" cy="0" rx="5" ry="6" fill="#FFFFFF"/>
        <ellipse cx="0" cy="0" rx="3.8" ry="5.2" fill="#312E81"/>
        <ellipse cx="0" cy="0.4" rx="2" ry="2.8" fill="#0F172A"/>
        <circle cx="-1.2" cy="-1.8" r="1.5" fill="#FFFFFF"/>
        <circle cx="1.5" cy="1.5" r="0.8" fill="#FFFFFF" opacity="0.8"/>
        <path d="M -5.5 -3 Q 0 -6.5 5.5 -3 Q 7 -4 7.5 -6" stroke="#141524" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M -2.8 4.6 Q 0 5.8 2.8 4.6" stroke="#475569" stroke-width="1" fill="none" stroke-linecap="round"/>
      </g>
      <g transform="translate(10, -2)">
        <ellipse cx="0" cy="0" rx="5" ry="6" fill="#FFFFFF"/>
        <ellipse cx="0" cy="0" rx="3.8" ry="5.2" fill="#312E81"/>
        <ellipse cx="0" cy="0.4" rx="2" ry="2.8" fill="#0F172A"/>
        <circle cx="-1.2" cy="-1.8" r="1.5" fill="#FFFFFF"/>
        <circle cx="1.5" cy="1.5" r="0.8" fill="#FFFFFF" opacity="0.8"/>
        <path d="M -5.5 -3 Q 0 -6.5 5.5 -3 Q 7 -4 7.5 -6" stroke="#141524" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M -2.8 4.6 Q 0 5.8 2.8 4.6" stroke="#475569" stroke-width="1" fill="none" stroke-linecap="round"/>
      </g>
    `;
    let browsSvg = `<path d="M -14 -9 Q -9 -12 -4 -9" stroke="#1E202C" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M 4 -9 Q 9 -12 14 -9" stroke="#1E202C" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    let mouthSvg = `<path d="M -4 13 Q 0 15 4 13" stroke="#1E202C" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;
    let extraFaceSvg = "";

    switch (expression) {
      case "sad":
        browsSvg = `<line x1="-15" y1="-9" x2="-6" y2="-12" stroke="#1E202C" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="-12" x2="15" y2="-9" stroke="#1E202C" stroke-width="2" stroke-linecap="round"/>`;
        mouthSvg = `<path d="M -5 14 Q 0 11 5 14" fill="none" stroke="#1E202C" stroke-width="1.8" stroke-linecap="round"/>`;
        break;
      case "crying":
        browsSvg = `<line x1="-15" y1="-9" x2="-6" y2="-12" stroke="#1E202C" stroke-width="2"/><line x1="6" y1="-12" x2="15" y2="-9" stroke="#1E202C" stroke-width="2"/>`;
        mouthSvg = `<path d="M -5 14 Q 0 11 5 14" fill="none" stroke="#1E202C" stroke-width="1.8"/>`;
        extraFaceSvg = `<path d="M -10 4 L -10 14 M 10 4 L 10 14" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round"/>`;
        break;
      case "happy":
        browsSvg = `<path d="M -14 -9 Q -9 -12 -4 -9" stroke="#1E202C" stroke-width="1.8" fill="none"/><path d="M 4 -9 Q 9 -12 14 -9" stroke="#1E202C" stroke-width="1.8" fill="none"/>`;
        eyesSvg = `<path d="M -14 0 Q -9 -5 -4 0" stroke="#1E202C" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M 4 0 Q 9 -5 14 0" stroke="#1E202C" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
        mouthSvg = `<path d="M -5 12 Q 0 16 5 12" fill="none" stroke="#1E202C" stroke-width="2" stroke-linecap="round"/>`;
        break;
      case "angry":
        browsSvg = `<line x1="-15" y1="-12" x2="-6" y2="-8" stroke="#1E202C" stroke-width="2.4" stroke-linecap="round"/><line x1="6" y1="-8" x2="15" y2="-12" stroke="#1E202C" stroke-width="2.4" stroke-linecap="round"/>`;
        mouthSvg = `<line x1="-5" y1="13" x2="5" y2="12" stroke="#1E202C" stroke-width="2" stroke-linecap="round"/>`;
        break;
      case "tired":
        eyesSvg = `<path d="M -14 0 Q -9 -3 -4 0" stroke="#1E202C" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M 4 0 Q 9 -3 14 0" stroke="#1E202C" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        mouthSvg = `<line x1="-4" y1="13" x2="4" y2="13" stroke="#1E202C" stroke-width="1.8" stroke-linecap="round"/>`;
        break;
    }

    const phoneSvg =
      pose.holdingPhone || action === "holding_phone" || action === "using_phone"
        ? `<rect x="24" y="-6" width="12" height="20" rx="2.5" fill="#0F172A" stroke="#38BDF8" stroke-width="1.6"/>`
        : "";

    return `
      <g transform="translate(${cx}, ${baseY}) scale(${scale})">
        <!-- Floor Shadow -->
        <ellipse cx="0" cy="${isSitting ? 74 : 100}" rx="${isSitting ? 48 : 42}" ry="8" fill="#000000" opacity="0.6"/>
        ${
          isSitting
            ? `<rect x="-28" y="-36" width="56" height="62" rx="12" fill="#111219" stroke="#252736" stroke-width="2"/>
               <rect x="-16" y="-52" width="32" height="14" rx="5" fill="#111219" stroke="#252736" stroke-width="1.5"/>`
            : ""
        }
        <!-- Legs -->
        <g transform="translate(-10, 42) rotate(${isSitting ? 6 : pose.leftLegRotate})">
          <rect x="-6" y="0" width="12" height="${isSitting ? 44 : 54}" rx="5" fill="#12131C" stroke="#282B3E" stroke-width="1.5"/>
          <path d="M -6 ${isSitting ? 38 : 48} L 5 ${isSitting ? 38 : 48} L 7 ${isSitting ? 46 : 58} L -7 ${isSitting ? 46 : 58} Z" fill="#1E202E"/>
          <rect x="-8" y="${isSitting ? 44 : 56}" width="16" height="3" rx="1" fill="#E2E8F0"/>
        </g>
        <g transform="translate(10, 42) rotate(${isSitting ? -6 : pose.rightLegRotate})">
          <rect x="-6" y="0" width="12" height="${isSitting ? 44 : 54}" rx="5" fill="#12131C" stroke="#282B3E" stroke-width="1.5"/>
          <path d="M -6 ${isSitting ? 38 : 48} L 5 ${isSitting ? 38 : 48} L 7 ${isSitting ? 46 : 58} L -7 ${isSitting ? 46 : 58} Z" fill="#1E202E"/>
          <rect x="-8" y="${isSitting ? 44 : 56}" width="16" height="3" rx="1" fill="#E2E8F0"/>
        </g>
        <!-- Torso -->
        <g transform="rotate(${pose.torsoRotate})">
          <rect x="-25" y="-20" width="50" height="66" rx="17" fill="#1C1E2B" stroke="#383C52" stroke-width="2"/>
          <path d="M -14 24 L 14 24 L 11 38 L -11 38 Z" fill="#26293B" opacity="0.85"/>
          <line x1="-5" y1="-10" x2="-5" y2="5" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="5" y1="-10" x2="5" y2="5" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Arms -->
          <g transform="translate(-24, -10) rotate(${isSitting ? 16 : pose.leftArmRotate})">
            <rect x="-6" y="0" width="12" height="42" rx="6" fill="#1C1E2B" stroke="#383C52" stroke-width="1.6"/>
            <circle cx="0" cy="44" r="5" fill="#FFF3EB"/>
          </g>
          <g transform="translate(24, -10) rotate(${isSitting ? -16 : pose.rightArmRotate})">
            <rect x="-6" y="0" width="12" height="42" rx="6" fill="#1C1E2B" stroke="#383C52" stroke-width="1.6"/>
            <circle cx="0" cy="44" r="5" fill="#FFF3EB"/>
            ${phoneSvg}
          </g>
          <!-- Anime Head + Hair + Headphones -->
          <g transform="translate(0, ${-48 + pose.headOffsetY}) rotate(${pose.headRotate})">
            <!-- Back Hair -->
            <path d="M -24 -12 C -28 4 -25 22 -18 30 C -14 16 -16 2 -14 -10 Z" fill="#141524"/>
            <path d="M 24 -12 C 28 4 25 22 18 30 C 14 16 16 2 14 -10 Z" fill="#141524"/>
            <circle cx="0" cy="-14" r="20" fill="#141524"/>
            <rect x="-6" y="16" width="12" height="12" fill="#FFF3EB" stroke="#222436" stroke-width="1"/>
            <!-- Tapered Jawline -->
            <path d="M -22 -6 C -22 8 -14 21 0 26 C 14 21 22 8 22 -6 C 22 -16 -22 -16 -22 -6 Z" fill="#FFF3EB" stroke="#222436" stroke-width="1.8"/>
            <!-- Bangs -->
            <path d="M -24 -8 Q -14 3 -6 -4 Q 0 6 6 -4 Q 14 3 24 -8 Q 18 -26 0 -26 Q -18 -26 -24 -8 Z" fill="#141524"/>
            <path d="M -23 -6 C -25 2 -23 12 -20 16 C -20 8 -21 2 -19 -6 Z" fill="#141524"/>
            <path d="M 23 -6 C 25 2 23 12 20 16 C 20 8 21 2 19 -6 Z" fill="#141524"/>
            <!-- Headphones -->
            <path d="M -23 -3 Q 0 -30 23 -3" stroke="#475569" stroke-width="3.5" fill="none" stroke-linecap="round"/>
            <rect x="-27" y="-7" width="5" height="18" rx="2.5" fill="#1E293B" stroke="#64748B" stroke-width="1.3"/>
            <rect x="22" y="-7" width="5" height="18" rx="2.5" fill="#1E293B" stroke="#64748B" stroke-width="1.3"/>
            <!-- Blush -->
            <ellipse cx="-12" cy="6" rx="4.5" ry="2.2" fill="#FB7185" opacity="0.35"/>
            <ellipse cx="12" cy="6" rx="4.5" ry="2.2" fill="#FB7185" opacity="0.35"/>
            <!-- Nose -->
            <circle cx="0" cy="6" r="1" fill="#E29578"/>
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
        ? (() => {
            const sents = subtitleText
              .split(/(?<=[.?!;])\s+|\n+/)
              .map((s) => s.trim())
              .filter(Boolean);
            const shortText = sents[0] || subtitleText;
            const displayStr =
              shortText.length > 80 ? shortText.slice(0, 77) + "..." : shortText;
            const boxW = Math.min(
              width * 0.88,
              Math.max(260, displayStr.length * 11 + 48)
            );
            return `<g transform="translate(${width * 0.5}, ${height - 48})">
              <rect x="${-boxW / 2}" y="-22" width="${boxW}" height="44" rx="22" fill="#0B0B0D" opacity="0.92" stroke="#3B82F6" stroke-opacity="0.5" stroke-width="1.5"/>
              <text x="0" y="5" text-anchor="middle" fill="#F8FAFC" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="16" font-weight="600">&ldquo;${displayStr
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}&rdquo;</text>
            </g>`;
          })()
        : ""
    }
  </svg>`;
}
