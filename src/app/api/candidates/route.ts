import { createCandidate, listCandidates, runEvaluation } from "@/lib/candidates";
import { cleanText, extractCvText } from "@/lib/cv";
import { errorResponse } from "@/lib/http";

export const maxDuration = 120;

export async function GET() {
  try {
    return Response.json({ candidates: await listCandidates() });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Arjun adds a CV manually (file upload or pasted text) for a chosen role. */
export async function POST(req: Request) {
  let id: string | null = null;
  try {
    const form = await req.formData();
    const role = form.get("role");
    if (role !== "PM" && role !== "SPM") return Response.json({ error: "Select a role: PM or SPM." }, { status: 400 });

    const file = form.get("file");
    const pasted = String(form.get("text") ?? "");
    let cvText: string;
    let filename: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) return Response.json({ error: "File too large (max 10 MB)." }, { status: 400 });
      cvText = await extractCvText(file);
      filename = file.name;
    } else {
      cvText = cleanText(pasted);
    }
    if (cvText.length < 200) {
      return Response.json(
        { error: "Could not read enough text from this CV (is it a scanned image?). Paste the CV text instead." },
        { status: 400 },
      );
    }

    const email = String(form.get("email") ?? "").trim() || null;
    id = await createCandidate({ role, cvText: cvText.slice(0, 60000), filename, email });
    await runEvaluation(id);
    return Response.json({ id });
  } catch (e) {
    // Candidate is kept (with last_error) so Arjun can retry evaluation from the detail page.
    return errorResponse(e, id ? { id } : undefined);
  }
}
