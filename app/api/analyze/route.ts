import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const VALID_SECTIONS = ["Hero", "CTA", "Social Proof"] as const;

type ValidSection = (typeof VALID_SECTIONS)[number];

type AnalyzeRequestBody = {
  url?: unknown;
  sections?: unknown;
};

type AnalyzeResponse = {
  sections: Array<{
    name: string;
    observation: string;
    evidence: string;
    recommendation: string;
    confidence: {
      level: "High" | "Medium" | "Low";
      reason: string;
    };
  }>;
  summary: {
    strengths: string[];
    gaps: string[];
    actions: string[];
  };
};

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeSections(input: unknown): ValidSection[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input.filter((value): value is ValidSection => {
    return (
      typeof value === "string" &&
      VALID_SECTIONS.includes(value as ValidSection)
    );
  });

  return VALID_SECTIONS.filter((section) => normalized.includes(section));
}

function buildResponseSchema(selectedSections: ValidSection[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["sections", "summary"],
    properties: {
      sections: {
        type: "array",
        minItems: selectedSections.length,
        maxItems: selectedSections.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "observation",
            "evidence",
            "recommendation",
            "confidence"
          ],
          properties: {
            name: {
              type: "string",
              enum: selectedSections
            },
            observation: {
              type: "string"
            },
            evidence: {
              type: "string"
            },
            recommendation: {
              type: "string"
            },
            confidence: {
              type: "object",
              additionalProperties: false,
              required: ["level", "reason"],
              properties: {
                level: {
                  type: "string",
                  enum: ["High", "Medium", "Low"]
                },
                reason: {
                  type: "string"
                }
              }
            }
          }
        }
      },
      summary: {
        type: "object",
        additionalProperties: false,
        required: ["strengths", "gaps", "actions"],
        properties: {
          strengths: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "string"
            }
          },
          gaps: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "string"
            }
          },
          actions: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "string"
            }
          }
        }
      }
    }
  };
}

function isAnalyzeResponse(value: unknown): value is AnalyzeResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as AnalyzeResponse;

  return (
    Array.isArray(candidate.sections) &&
    candidate.sections.every(
      (section) =>
        typeof section?.name === "string" &&
        typeof section?.observation === "string" &&
        typeof section?.evidence === "string" &&
        typeof section?.recommendation === "string" &&
        typeof section?.confidence?.level === "string" &&
        typeof section?.confidence?.reason === "string"
    ) &&
    Array.isArray(candidate.summary?.strengths) &&
    Array.isArray(candidate.summary?.gaps) &&
    Array.isArray(candidate.summary?.actions)
  );
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY environment variable." },
      { status: 500 }
    );
  }

  let body: AnalyzeRequestBody;

  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const sections = normalizeSections(body.sections);

  if (!url || !isValidUrl(url)) {
    return NextResponse.json(
      { error: "Input `url` must be a valid absolute URL." },
      { status: 400 }
    );
  }

  if (sections.length === 0) {
    return NextResponse.json(
      {
        error:
          "Input `sections` must include at least one of: Hero, CTA, Social Proof."
      },
      { status: 400 }
    );
  }

  const prompt = [
    "You are generating a simulated landing-page analysis for an MVP product.",
    "You are given only a URL and selected sections. Do not claim to have scraped, visited, or read the actual page.",
    "Infer a plausible SaaS landing page review from the URL and common category patterns, but keep each point concrete and specific.",
    "Follow these product guardrails:",
    "- Evidence over opinion",
    "- Clarity over completeness",
    "- Transparency over false certainty",
    "- Focused scope over shallow coverage",
    "For each section:",
    "- Observation: describe the main issue or strength clearly and specifically",
    "- Evidence: reference concrete elements such as headline wording, CTA text, layout structure, or visual hierarchy",
    "- Recommendation: give a direct, actionable improvement tied to the evidence",
    "- Confidence: assign High, Medium, or Low and explain why based on issue visibility, consistency across competitors, and level of subjectivity",
    "- Keep each field concise: 1-3 sentences maximum",
    "- Avoid generic advice like 'improve UX' or 'make it better'",
    "- Avoid generic SaaS advice that could apply to any landing page",
    "- If the evidence is mostly visible in first-screen structure or copy, confidence should usually be higher",
    "- If the point depends on inferred conversion behavior or more subjective interpretation, confidence should be lower",
    "For the summary:",
    "- Return 2-3 strengths, 2-3 gaps, and 2-3 actions",
    "- Keep them specific, product-like, and grounded in the section findings",
    "",
    `URL: ${url}`,
    `Sections to analyze: ${sections.join(", ")}`
  ].join("\n");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content:
            "Generate a concise, structured JSON landing-page analysis. Do not use tools. Do not mention that you are an AI model. Every section must contain specific observation, evidence, recommendation, and confidence reasoning."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4,
      text: {
        format: {
          type: "json_schema",
          name: "landing_page_analysis",
          strict: true,
          schema: buildResponseSchema(sections)
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    return NextResponse.json(
      {
        error: "OpenAI request failed.",
        details: errorText
      },
      { status: 502 }
    );
  }

  const result = (await response.json()) as {
    output_text?: string;
  };

  if (!result.output_text) {
    return NextResponse.json(
      { error: "Model response did not include structured output." },
      { status: 502 }
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(result.output_text);
  } catch {
    return NextResponse.json(
      { error: "Model returned invalid JSON output." },
      { status: 502 }
    );
  }

  if (!isAnalyzeResponse(parsed)) {
    return NextResponse.json(
      { error: "Model output did not match the expected response shape." },
      { status: 502 }
    );
  }

  return NextResponse.json(parsed);
}
