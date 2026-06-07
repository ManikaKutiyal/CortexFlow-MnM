import { type NextRequest, NextResponse } from "next/server";
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_TRANSCRIBE_MODEL = process.env.GROQ_TRANSCRIBE_MODEL ?? "whisper-large-v3-turbo";
const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const runtime = "nodejs";
export const maxDuration = 60;
interface GroqWord {
  word: string;
  start: number;
  end: number;
}
interface GroqVerboseResponse {
  text: string;
  words?: GroqWord[];
  duration?: number;
}
function extractPauseMap(words: GroqWord[]): number[] {
  const pauses: number[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const gap = words[i + 1].start - words[i].end;
    if (gap > 0.1) {
      pauses.push(parseFloat(gap.toFixed(3)));
    }
  }
  return pauses;
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
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
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
        { error: "Audio file exceeds 25MB limit." },
        { status: 413 }
      );
    }
    const mimeType = resolveMimeType(audioFile);
    const audioBuffer = await audioFile.arrayBuffer();
    const groqForm = new FormData();
    groqForm.append("file", new Blob([audioBuffer], { type: mimeType }), "audio.webm");
    groqForm.append("model", GROQ_TRANSCRIBE_MODEL);
    groqForm.append("response_format", "verbose_json");
    groqForm.append("language", "en");
    const groqRes = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: groqForm,
      signal: AbortSignal.timeout(60_000),
    });
    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      return NextResponse.json(
        { error: `Groq transcription error: ${errorText}` },
        { status: groqRes.status }
      );
    }
    const groqData = (await groqRes.json()) as GroqVerboseResponse;
    const transcript = (groqData.text ?? "").trim();
    if (!transcript) {
      return NextResponse.json({ error: "No speech detected in audio." }, { status: 422 });
    }
    const words: GroqWord[] = Array.isArray(groqData.words)
      ? groqData.words.filter(
          (w) =>
            typeof w.word === "string" &&
            typeof w.start === "number" &&
            typeof w.end === "number"
        )
      : [];
    const pauseMap = extractPauseMap(words);
    return NextResponse.json({
      transcript,
      pauseMap,
      wordTimestamps: words,
      duration: typeof groqData.duration === "number" ? groqData.duration : undefined,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 });
  }
}