// ============================================================================
// DARKTOON AI — Local Object Storage Service
// (src/backend/storage/storageService.ts)
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";

export class StorageService {
  private static getStorageRoot(): string {
    const rawRoot = process.env.STORAGE_ROOT || "./storage/objects";
    return path.resolve(process.cwd(), rawRoot);
  }

  /**
   * Resolves absolute path and prevents directory traversal attacks.
   */
  static resolveAbsolutePath(storageKey: string): string {
    const root = this.getStorageRoot();
    if (!storageKey || storageKey.includes("..")) {
      throw new Error("STORAGE_PATH_TRAVERSAL_BLOCKED: path traversal attempt detected");
    }

    const resolved = path.resolve(root, storageKey);
    // Security check: resolved path must strictly reside within root directory
    if (!resolved.startsWith(root)) {
      throw new Error("STORAGE_PATH_TRAVERSAL_BLOCKED: resolved path is outside storage root");
    }
    return resolved;
  }

  /**
   * Builds a normalized relative storage key
   */
  static buildStorageKey(
    projectId: string,
    category: "audio" | "images" | "animations" | "renders" | "temp" | string,
    fileName: string
  ): string {
    const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeFile = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    return path.posix.join("projects", safeProject, safeCategory, safeFile);
  }

  /**
   * Saves object to local disk storage
   */
  static saveObject(storageKey: string, data: Buffer | Uint8Array | string): string {
    const absPath = this.resolveAbsolutePath(storageKey);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, data);
    return absPath;
  }

  /**
   * Reads object from local disk storage
   */
  static readObject(storageKey: string): Buffer {
    const absPath = this.resolveAbsolutePath(storageKey);
    return fs.readFileSync(absPath);
  }

  /**
   * Checks if an object exists in storage
   */
  static exists(storageKey: string): boolean {
    try {
      const absPath = this.resolveAbsolutePath(storageKey);
      return fs.existsSync(absPath);
    } catch {
      return false;
    }
  }

  /**
   * Calculates audio duration precisely using RIFF header for WAV or FFmpeg for MP3/AAC/M4A/FLAC
   */
  static getAudioDuration(buffer: Buffer): number {
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.length > 44) {
      const byteRate = buffer.readUInt32LE(28) || 44100;
      return Math.max(1, Number(((buffer.length - 44) / byteRate).toFixed(2)));
    }
    try {
      const ffmpegBin =
        ffmpegStatic ||
        path.join(
          process.cwd(),
          "node_modules",
          "ffmpeg-static",
          process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
        );
      const res = spawnSync(
        ffmpegBin,
        ["-i", "pipe:0", "-ac", "1", "-ar", "22050", "-f", "s16le", "pipe:1"],
        {
          input: buffer,
          maxBuffer: 40 * 1024 * 1024,
        }
      );
      if (res.stdout && res.stdout.length > 0) {
        return Number((res.stdout.length / (22050 * 2)).toFixed(2));
      }
    } catch {
      // fallback
    }
    return Math.max(8, Math.round(buffer.length / 16000));
  }

  /**
   * Extracts normalized peak heights (0.0 to 1.0) for audio waveform visualization
   */
  static extractWaveformPeaks(buffer: Buffer, numPeaks: number = 96): number[] {
    const peaks: number[] = [];
    if (!buffer || buffer.length <= 44) {
      return Array(numPeaks).fill(0.1);
    }

    let pcm = buffer;
    let dataOffset = 0;

    // Skip WAV header (44 bytes) if present, or decode MP3/M4A to raw PCM
    if (buffer.toString("ascii", 0, 4) === "RIFF") {
      dataOffset = 44;
    } else {
      try {
        const ffmpegBin =
          ffmpegStatic ||
          path.join(
            process.cwd(),
            "node_modules",
            "ffmpeg-static",
            process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
          );
        const res = spawnSync(
          ffmpegBin,
          ["-i", "pipe:0", "-ac", "1", "-ar", "22050", "-f", "s16le", "pipe:1"],
          {
            input: buffer,
            maxBuffer: 40 * 1024 * 1024,
          }
        );
        if (res.stdout && res.stdout.length > 0) {
          pcm = res.stdout;
          dataOffset = 0;
        }
      } catch {
        dataOffset = 0;
      }
    }

    const sampleCount = Math.floor((pcm.length - dataOffset) / 2);
    if (sampleCount <= 0) {
      return Array(numPeaks).fill(0.1);
    }

    const samplesPerPeak = Math.max(1, Math.floor(sampleCount / numPeaks));

    for (let p = 0; p < numPeaks; p++) {
      let maxAmp = 0;
      const startSample = p * samplesPerPeak;
      const endSample = Math.min(startSample + samplesPerPeak, sampleCount);

      for (let s = startSample; s < endSample; s++) {
        const byteIndex = dataOffset + s * 2;
        if (byteIndex + 1 < pcm.length) {
          const sample = Math.abs(pcm.readInt16LE(byteIndex));
          if (sample > maxAmp) maxAmp = sample;
        }
      }

      // Normalize to 0.0 - 1.0 with a realistic minimum display amplitude
      const normalized = Math.min(1.0, Math.max(0.08, parseFloat((maxAmp / 32768).toFixed(3))));
      peaks.push(normalized);
    }

    return peaks;
  }

  /**
   * Generates a synthesized 16-bit mono 22050Hz WAV audio file simulating a podcast / dialogue conversation
   */
  static generateSynthesizedConversationWav(durationSeconds: number): Buffer {
    const sampleRate = 22050;
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = Math.floor(durationSeconds * sampleRate);
    const dataSize = totalSamples * bytesPerSample;

    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF identifier
    buffer.write("RIFF", 0);
    // file length
    buffer.writeUInt32LE(36 + dataSize, 4);
    // RIFF type
    buffer.write("WAVE", 8);
    // format chunk identifier
    buffer.write("fmt ", 12);
    // format chunk length
    buffer.writeUInt32LE(16, 16);
    // sample format (1 is PCM)
    buffer.writeUInt16LE(1, 20);
    // channel count
    buffer.writeUInt16LE(numChannels, 22);
    // sample rate
    buffer.writeUInt32LE(sampleRate, 24);
    // byte rate (sampleRate * numChannels * bytesPerSample)
    buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
    // block align (numChannels * bytesPerSample)
    buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
    // bits per sample
    buffer.writeUInt16LE(bitsPerSample, 34);
    // data chunk identifier
    buffer.write("data", 36);
    // data chunk length
    buffer.writeUInt32LE(dataSize, 40);

    // Synthesize alternating conversation patterns (Voice A ~ 220Hz-440Hz, Voice B ~ 330Hz-550Hz, pauses)
    let offset = 44;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const cycle = t % 6; // 6-second conversation turn loop
      let amp = 0;

      if (cycle < 2.5) {
        // Speaker 1 talking
        const freq = 260 + 40 * Math.sin(2 * Math.PI * 2 * t);
        amp = 0.65 * Math.sin(2 * Math.PI * freq * t) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 6 * t));
      } else if (cycle >= 2.8 && cycle < 5.5) {
        // Speaker 2 talking
        const freq = 380 + 50 * Math.sin(2 * Math.PI * 3 * t);
        amp = 0.6 * Math.sin(2 * Math.PI * freq * t) * (0.8 + 0.2 * Math.cos(2 * Math.PI * 5 * t));
      } else {
        // Natural pause between turns
        amp = 0.02 * (Math.random() - 0.5);
      }

      const sample = Math.max(-32767, Math.min(32767, Math.floor(amp * 32767)));
      buffer.writeInt16LE(sample, offset);
      offset += 2;
    }

    return buffer;
  }
}
