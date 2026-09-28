import "server-only";

/** Extracts plain text from an uploaded CV (PDF, DOCX, TXT/MD). */
export async function extractCvText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  let text: string;

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const { extractText } = await import("unpdf");
    const out = await extractText(new Uint8Array(buf), { mergePages: true });
    text = Array.isArray(out.text) ? out.text.join("\n") : out.text;
  } else if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    text = (await mammoth.extractRawText({ buffer: buf })).value;
  } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    text = buf.toString("utf8");
  } else {
    throw new Error("Unsupported file type. Upload a PDF, DOCX or TXT file, or paste the CV text.");
  }

  return cleanText(text);
}

export function cleanText(t: string) {
  return t.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
