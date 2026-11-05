import fs from "node:fs";
import path from "node:path";
import git from "isomorphic-git";

const dir = process.cwd();

const IGNORED_DIRS = new Set(["node_modules", ".next", ".git", "storage", "out", "dist"]);
const IGNORED_FILES = new Set(["next-env.d.ts"]);

function collectFiles(currentDir, relBase = "") {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  let results = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      results = results.concat(
        collectFiles(
          path.join(currentDir, entry.name),
          relBase ? `${relBase}/${entry.name}` : entry.name
        )
      );
    } else if (entry.isFile()) {
      if (IGNORED_FILES.has(entry.name)) continue;
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      results.push(relPath);
    }
  }
  return results;
}

async function runCommit() {
  await git.init({ fs, dir, defaultBranch: "main" });
  await git.setConfig({ fs, dir, path: "user.name", value: "User" });
  await git.setConfig({ fs, dir, path: "user.email", value: "user@example.com" });

  const files = collectFiles(dir);
  for (const filepath of files) {
    await git.add({ fs, dir, filepath });
  }

  const commitMessage =
    "feat(darktoon-ai): implement full-stack Audio to 2D Animated Storytelling Studio (PRD v1.0)\n\n" +
    "- Add 18-table relational database schema & PostgreSQL/SQLite migrations\n" +
    "- Implement pluggable AI Provider Adapters (ASR, Diarization, LLM Director, Image, Video) with strict NOT_CONFIGURED check & [MOCK] dev mode\n" +
    "- Build articulated 8-part Dark Minimalist 2D Character Rig (10 expressions, 17 actions, 11 reusable backgrounds)\n" +
    "- Implement Hybrid Animation Router (RIG_2D / AI_VIDEO / STATIC_MOTION), Quality Control validator, Cost Tracking & FFmpeg H.264 MP4 Renderer\n" +
    "- Build 8-view Dark Minimalist Studio UI (3-column Storyboard Editor, 6-track Timeline, Character Library, Waveform Editor, Export Center)\n" +
    "- Add 12 automated unit/integration tests & live E2E verification suite";

  const sha = await git.commit({
    fs,
    dir,
    message: commitMessage,
    author: {
      name: "User",
      email: "user@example.com",
    },
  });

  fs.writeFileSync(path.join(dir, ".git", "COMMIT_EDITMSG"), commitMessage + "\n", "utf-8");

  const log = await git.log({ fs, dir, depth: 1 });
  console.log(`✔ Committed ${files.length} files to branch 'main'`);
  console.log(`✔ Commit SHA: ${sha}`);
  console.log(`✔ Commit Summary: ${log[0].commit.message.split("\n")[0]}`);
}

runCommit().catch((err) => {
  console.error("Commit error:", err);
  process.exit(1);
});
