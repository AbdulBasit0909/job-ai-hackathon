import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { groq } from "@ai-sdk/groq";

const candidateModels = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

const questionSchema = z.object({
  questions: z.array(
    z.object({
      category: z.enum(["Behavioral", "Technical", "Company/Culture"]).describe("The interview question category."),
      question: z.string().describe("The interview question text."),
      modelAnswer: z.string().describe("A concise model answer showing what a strong response covers (2-3 sentences)."),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const { jobDescription, jobTitle, company } = await req.json();

    const prompt = `
      Generate 8 realistic and role-specific interview preparation questions for:
      Role: ${jobTitle || "Software Engineer"}
      Company: ${company || "Tech Company"}
      ${jobDescription ? `Job Description: ${jobDescription.slice(0, 3000)}` : ""}

      Create a balanced mix:
      - 3 Behavioral questions (leadership, teamwork, conflict resolution)
      - 3 Technical questions (specific to the role and job description)
      - 2 Company/Culture questions (culture fit, motivation, values)

      For each question, provide the category, the question text, and a concise model answer showing what a strong response should cover.
    `;

    let objectResult: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const { object } = await generateObject({
          model: groq(modelName),
          schema: questionSchema,
          prompt,
        });
        objectResult = object;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!objectResult) {
      throw lastError || new Error("Failed to generate questions");
    }

    return NextResponse.json(objectResult);
  } catch (error: any) {
    console.error("AI Questions Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate interview questions" },
      { status: 500 }
    );
  }
}