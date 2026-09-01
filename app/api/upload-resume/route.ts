import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let text = "";

    // 1. Parse PDF using unpdf
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const pdf = await extractText(arrayBuffer, { mergePages: true });
      text = pdf.text;
    }
    // 2. Parse DOCX using mammoth (requires Node Buffer)
    else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx")
    ) {
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }
    // 3. Parse plain text
    else if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
      text = new TextDecoder().decode(arrayBuffer);
    } 
    else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, DOCX, or TXT." },
        { status: 400 }
      );
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Could not extract any text from the file." },
        { status: 400 }
      );
    }

    // Clean and normalize extracted text
    const cleanedText = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return NextResponse.json({ text: cleanedText });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 });
  }
}