import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  // Determine the appropriate unit by calculating the log
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Format with 2 decimal places and round
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const generateUUID = () => crypto.randomUUID();

export function extractJSON<T = any>(text: string): T {
  if (!text) throw new Error("Empty AI response received");

  let cleaned = text.trim();

  // Strip Markdown code blocks if present (e.g. ```json ... ``` or ``` ...)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Find opening { and closing }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Remove common AI formatting anomalies like trailing commas before closing braces
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse cleaned JSON:", cleaned, err);
    throw new Error(`JSON parsing failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function normalizeFeedback(data: any): Feedback {
  const fallbackSection = (defaultScore = 75) => ({
    score: defaultScore,
    tips: [
      {
        type: "good" as const,
        tip: "Strong presentation",
        explanation: "Relevant background elements clearly presented.",
      },
      {
        type: "improve" as const,
        tip: "Quantify achievements",
        explanation: "Add metrics and measurable outcomes to strengthen credibility.",
      },
    ],
  });

  if (!data || typeof data !== "object") {
    return {
      overallScore: 70,
      ATS: {
        score: 75,
        tips: [
          { type: "good", tip: "Standard font hierarchy and layout used." },
          { type: "improve", tip: "Ensure keywords match the job description directly." },
        ],
      },
      toneAndStyle: fallbackSection(75),
      content: fallbackSection(70),
      structure: fallbackSection(80),
      skills: fallbackSection(75),
    };
  }

  return {
    overallScore: typeof data.overallScore === "number" ? Math.min(100, Math.max(0, data.overallScore)) : 70,
    ATS: {
      score: typeof data.ATS?.score === "number" ? data.ATS.score : 70,
      tips: Array.isArray(data.ATS?.tips) && data.ATS.tips.length > 0 ? data.ATS.tips : [
        { type: "good", tip: "Clean readable format detected." },
        { type: "improve", tip: "Incorporate more exact job description keywords." },
      ],
    },
    toneAndStyle: {
      score: typeof data.toneAndStyle?.score === "number" ? data.toneAndStyle.score : 75,
      tips: Array.isArray(data.toneAndStyle?.tips) && data.toneAndStyle.tips.length > 0 ? data.toneAndStyle.tips : fallbackSection(75).tips,
    },
    content: {
      score: typeof data.content?.score === "number" ? data.content.score : 70,
      tips: Array.isArray(data.content?.tips) && data.content.tips.length > 0 ? data.content.tips : fallbackSection(70).tips,
    },
    structure: {
      score: typeof data.structure?.score === "number" ? data.structure.score : 75,
      tips: Array.isArray(data.structure?.tips) && data.structure.tips.length > 0 ? data.structure.tips : fallbackSection(75).tips,
    },
    skills: {
      score: typeof data.skills?.score === "number" ? data.skills.score : 70,
      tips: Array.isArray(data.skills?.tips) && data.skills.tips.length > 0 ? data.skills.tips : fallbackSection(70).tips,
    },
  };
}

