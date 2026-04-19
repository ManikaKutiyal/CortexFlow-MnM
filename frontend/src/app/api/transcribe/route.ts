import { type NextRequest, NextResponse } from "next/server";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
const GEMINI_API_BASE = (process.env.GEMINI_API_BASE ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
const GEMINI_TRANSCRIBE_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL ?? "gemini-2.5-flash";
const MAX_AUDIO_BYTES = 14 * 1024 * 1024;

export const runtime = "nodejs";
export const maxDuration = 60;

function extractPauseMap(wordTimestamps: Array<{ word: string; start: number; end: number }>): number[] {
  const pauses: number[] = [];
  for (let i = 0; i < wordTimestamps.length - 1; i++) {
    const gap = wordTimestamps[i + 1].start - wordTimestamps[i].end;
    if (gap > 0.1) {
      pauses.push(gap);
    }
  }
  return pauses;
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) {
    return "";
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const content = (candidate as { content?: unknown }).content;
    if (!content || typeof content !== "object") {
      continue;
    }

    const parts = (content as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    const text = parts
      .map((part) => (part && typeof part === "object" ? (part as { text?: unknown }).text : undefined))
      .filter((value): value is string => typeof value === "string")
      .join("\n")
      .trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function parseGeminiJson(text: string): { transcript: string; word_timestamps?: Array<{ word?: string; start?: number; end?: number }> } | null {
  const normalized = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(normalized) as { transcript: string; word_timestamps?: Array<{ word?: string; start?: number; end?: number }> };
  } catch {
    return null;
  }
}

function resolveMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name?.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp3": return "audio/mp3";
    case "wav": return "audio/wav";
    case "m4a": return "audio/m4a";
    case "ogg": return "audio/ogg";
    case "flac": return "audio/flac";
    case "webm": return "audio/webm";
    case "mp4": return "audio/mp4";
    case "aac": return "audio/aac";
    default: return "audio/webm";
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (audioFile.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Audio file is too large. Please upload a file under 14MB for Gemini inline audio processing." },
        { status: 413 }
      );
    }

    const audioBytes = new Uint8Array(await audioFile.arrayBuffer());
    const audioBase64 = Buffer.from(audioBytes).toString("base64");

    const geminiRes = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_TRANSCRIBE_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Transcribe this audio to plain English text. Return strict JSON with keys: transcript (string) and word_timestamps (array of {word,start,end} in seconds). If exact timestamps are not available, return an empty array for word_timestamps.",
              },
              {
                inlineData: {
                  mimeType: resolveMimeType(audioFile),
                  data: audioBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!geminiRes.ok) {
      const error = await geminiRes.text();
      return NextResponse.json({ error: `Gemini API error: ${error}` }, { status: geminiRes.status });
    }

    const geminiData = await geminiRes.json();
    const generatedText = extractGeminiText(geminiData);
    const parsed = parseGeminiJson(generatedText);

    const transcript = (parsed?.transcript ?? generatedText).trim();
    if (!transcript) {
      return NextResponse.json({ error: "No speech was returned by Gemini." }, { status: 422 });
    }
    const rawWordTimestamps = Array.isArray(parsed?.word_timestamps) ? parsed.word_timestamps : [];
    const wordTimestamps = rawWordTimestamps
      .map((item) => ({
        word: typeof item.word === "string" ? item.word : "",
        start: typeof item.start === "number" ? item.start : Number.NaN,
        end: typeof item.end === "number" ? item.end : Number.NaN,
      }))
      .filter((item) => item.word && Number.isFinite(item.start) && Number.isFinite(item.end))
      .map((item) => ({ word: item.word, start: item.start, end: item.end }));

    const pauseMap = extractPauseMap(wordTimestamps);

    return NextResponse.json({
      transcript,
      pauseMap,
      wordTimestamps,
      duration: undefined,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}