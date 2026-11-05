// ============================================================================
// DARKTOON AI — Development Seed Script (scripts/seed.ts)
// ============================================================================

import { ensureInitialSeedData } from "../src/backend/services/authHelper.ts";
import { DarktoonRepository } from "../src/backend/repositories/darktoonRepository.ts";

async function main() {
  const user = await ensureInitialSeedData();
  const projects = DarktoonRepository.listProjects(user.id);
  console.log(
    `[SEED] Seeded user ${user.email} (${user.id}) with ${projects.length} project(s).`
  );
  for (const p of projects) {
    const scenes = DarktoonRepository.getScenesByProject(p.id);
    const chars = DarktoonRepository.getCharactersByProject(p.id);
    console.log(
      `[SEED] Project "${p.name}": ${scenes.length} scenes, ${chars.length} locked characters.`
    );
  }
}

main().catch((err) => {
  console.error("[SEED ERROR]", err);
  process.exit(1);
});
