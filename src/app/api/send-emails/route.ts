import { NextRequest } from "next/server";

interface EmailItem {
  to: string;
  subject: string;
  body: string;
}

export async function POST(req: NextRequest) {
  try {
    const { emails, from: fromOverride } = (await req.json()) as { emails: EmailItem[]; from?: string };
    if (!Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "No emails provided" }), { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const envFrom = process.env.RESEND_FROM;
    const from = (typeof fromOverride === 'string' && fromOverride.trim().length > 0)
      ? fromOverride.trim()
      : (typeof envFrom === 'string' && envFrom.trim().length > 0 ? envFrom.trim() : undefined);
    if (!apiKey || !from) {
      return new Response(
        JSON.stringify({ error: "Missing sender. Provide 'From' in the UI or set RESEND_FROM. Also ensure RESEND_API_KEY is set." }),
        { status: 500 }
      );
    }

    // Validate From format: allow either plain email or "Name <email@domain>"
    const emailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
    const nameEmailRegex = /^.{1,100}\s<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/;
    const isValidFrom = emailRegex.test(from) || nameEmailRegex.test(from);
    if (!isValidFrom) {
      return new Response(
        JSON.stringify({ error: "Invalid 'From' format. Use email@example.com or Name <email@example.com>." }),
        { status: 400 }
      );
    }

    const results: { to: string; id?: string; error?: string }[] = [];
    for (const item of emails) {
      if (!item.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(item.to)) {
        results.push({ to: item.to, error: "Invalid recipient" });
        continue;
      }

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: item.to,
          subject: item.subject || "",
          text: item.body || "",
        }),
      });

      if (!r.ok) {
        const errText = await r.text().catch(() => "");
        results.push({ to: item.to, error: errText || `HTTP ${r.status}` });
      } else {
        const data = (await r.json()) as { id?: string };
        results.push({ to: item.to, id: data?.id });
      }
    }

    const success = results.filter((x) => x.id).length;
    const failed = results.filter((x) => x.error).length;
    return new Response(
      JSON.stringify({ success, failed, results }),
      { status: failed > 0 && success === 0 ? 500 : 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500 }
    );
  }
}


