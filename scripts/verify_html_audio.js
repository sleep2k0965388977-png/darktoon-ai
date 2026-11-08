const fs = require('fs');
const html = fs.readFileSync('darktoon_studio_standalone.html', 'utf-8');

// Extract studioScenes
const scenesMatch = html.match(/const studioScenes = (\[[\s\S]*?\]);\s*let curIdx/);
const studioScenes = eval(scenesMatch[1]);
const totalDuration = 65.0;

function getActiveSubtitle(s, timeInScene) {
  const sents = s.text.split(/(?<=[.?!;])\s+|\n+/).map(x => x.trim()).filter(Boolean);
  if (sents.length <= 1) return s.text;
  const scDur = Math.max(1, s.end - s.start);
  const totalChars = sents.reduce((acc, x) => acc + Math.max(12, x.length), 0);
  let elapsed = 0;
  for (let i = 0; i < sents.length; i++) {
    const sentDur = (Math.max(12, sents[i].length) / totalChars) * scDur;
    if (timeInScene <= elapsed + sentDur || i === sents.length - 1) {
      return sents[i];
    }
    elapsed += sentDur;
  }
  return sents[0];
}

console.log('=== MASTER TIMELINE AUDIO SYNC SIMULATION ===');
const testTimes = [0, 4.5, 9.5, 14.0, 20.0, 27.0, 34.0, 41.0, 48.0, 54.0, 60.0];
for (const t of testTimes) {
  const scIdx = studioScenes.findIndex(s => t >= s.start && (s.index === 5 ? t <= s.end : t < s.end));
  const sc = studioScenes[scIdx];
  const timeInSc = t - sc.start;
  const sub = getActiveSubtitle(sc, timeInSc);
  console.log(`[${t.toFixed(1).padStart(4, '0')}s] Scene 0${sc.index} (${sc.bg} | ${sc.action.padEnd(12)} | ${sc.expression.padEnd(8)}): "${sub}"`);
}
