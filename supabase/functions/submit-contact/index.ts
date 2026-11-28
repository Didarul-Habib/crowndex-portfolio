import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://crowndex.pages.dev",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4174",
  "http://127.0.0.1:4174",
];

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string,
  allowed: boolean,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "authorization, x-client-info, apikey, content-type, x-supabase-api-version";
    headers["Access-Control-Max-Age"] = "86400";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function sha256(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)).then((digest) =>
    Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const originAllowed = allowedOrigins.includes(origin);

  if (request.method === "OPTIONS") {
    return originAllowed
      ? jsonResponse({ ok: true }, 200, origin, true)
      : jsonResponse({ error: "Origin not allowed." }, 403, origin, false);
  }

  if (!originAllowed) {
    return jsonResponse({ error: "Origin not allowed." }, 403, origin, false);
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, origin, true);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 9000) {
    return jsonResponse({ error: "Message is too large." }, 413, origin, true);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey || !turnstileSecret) {
    return jsonResponse({ error: "Submission service is not configured." }, 503, origin, true);
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400, origin, true);
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const projectType = typeof input.projectType === "string" ? input.projectType.trim() : "Project enquiry";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const token = typeof input.turnstileToken === "string" ? input.turnstileToken.trim() : "";
  const honeypot = typeof input.website === "string" ? input.website.trim() : "";

  // Quietly discard automated form fills without revealing the honeypot.
  if (honeypot) {
    return jsonResponse({ ok: true }, 200, origin, true);
  }

  if (
    name.length < 1 || name.length > 100 ||
    email.length < 5 || email.length > 180 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    projectType.length < 1 || projectType.length > 100 ||
    message.length < 10 || message.length > 2500 ||
    !token
  ) {
    return jsonResponse({ error: "Please check the form fields and security check." }, 400, origin, true);
  }

  const verificationForm = new URLSearchParams({
    secret: turnstileSecret,
    response: token,
  });
  const clientIp = request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";
  if (clientIp) verificationForm.set("remoteip", clientIp);

  let verification: {
    success?: boolean;
    hostname?: string;
    "error-codes"?: string[];
  };
  try {
    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: verificationForm },
    );
    verification = await verifyResponse.json();
  } catch {
    return jsonResponse({ error: "Security verification is temporarily unavailable." }, 503, origin, true);
  }

  if (!verification.success) {
    return jsonResponse({ error: "Security check failed. Please try again." }, 400, origin, true);
  }

  const allowedHostnames = (Deno.env.get("TURNSTILE_HOSTNAMES") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (
    allowedHostnames.length > 0 &&
    (!verification.hostname || !allowedHostnames.includes(verification.hostname.toLowerCase()))
  ) {
    return jsonResponse({ error: "Security verification failed for this website." }, 403, origin, true);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let ipHash: string | null = null;
  if (clientIp) {
    ipHash = await sha256(`${Deno.env.get("CONTACT_RATE_LIMIT_SALT") ?? turnstileSecret}:${clientIp}`);
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: rateError } = await supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", cutoff);

    if (rateError) {
      return jsonResponse({ error: "Submission service is temporarily unavailable." }, 503, origin, true);
    }
    if ((count ?? 0) >= 5) {
      return jsonResponse({ error: "Please wait before sending another enquiry." }, 429, origin, true);
    }
  }

  const { error: insertError } = await supabase.from("contact_messages").insert({
    name,
    email,
    project_type: projectType,
    message,
    ip_hash: ipHash,
  });

  if (insertError) {
    // Do not log visitor content or database credentials.
    console.error("CrownDEX contact message insert failed:", insertError.code ?? "unknown");
    return jsonResponse({ error: "Your message could not be saved. Please try again." }, 503, origin, true);
  }

  return jsonResponse({ ok: true }, 200, origin, true);
});
