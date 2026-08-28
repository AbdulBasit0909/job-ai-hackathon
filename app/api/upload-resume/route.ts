import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let text = "";

    // Parse PDF using unpdf (Serverless ready)
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const pdf = await extractText(arrayBuffer, { mergePages: true });
      text = pdf.text;
    } 
    // Parse DOCX
    else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } 
    // Parse plain text
    else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      text = new TextDecoder().decode(arrayBuffer);
    } 
    else {
      return NextResponse.json({ error: "Unsupported file type. Please upload PDF, DOCX, or TXT." }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract any text from the file." }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 });
  }
}