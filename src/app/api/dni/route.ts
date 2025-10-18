import { NextRequest } from "next/server";
import { getClientIp, getRateStatus, increment } from "@/lib/rateLimitDni";

const EXTERNAL_API_URL = "https://biluz-apiocr.vercel.app/api/dni";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const status = await getRateStatus(ip);
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-RateLimit-Limit": String(status.limit),
    "X-RateLimit-Remaining": String(status.remaining),
    "X-RateLimit-Reset": status.resetAt,
  });
  return new Response(JSON.stringify(status), { status: 200, headers });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }

  const dnis = Array.isArray(body?.dnis) ? body.dnis.map((r: any) => String(r)) : [];
  if (!dnis.length) {
    return Response.json({ error: "Debe proporcionar el arreglo 'dnis'" }, { status: 400 });
  }

  const isMass = dnis.length > 1;

  // Límite diario sólo para consultas masivas
  if (isMass) {
    const statusBefore = await getRateStatus(ip);
    if (!statusBefore.allowed) {
      const headers = new Headers({
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(statusBefore.limit),
        "X-RateLimit-Remaining": String(statusBefore.remaining),
        "X-RateLimit-Reset": statusBefore.resetAt,
      });
      return new Response(
        JSON.stringify({
          error: "Límite diario alcanzado",
          detail: `Has agotado ${statusBefore.limit} consultas masivas de DNI para hoy. Intenta nuevamente mañana.`,
        }),
        { status: 429, headers }
      );
    }
    // Contamos el intento
    await increment(ip);
  }

  // Proxy a API externa
  try {
    const proxied = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dnis }),
    });
    const data = await proxied.json();

    const statusNow = await getRateStatus(ip);
    const headers = new Headers({
      "Content-Type": "application/json",
      "X-RateLimit-Limit": String(statusNow.limit),
      "X-RateLimit-Remaining": String(statusNow.remaining),
      "X-RateLimit-Reset": statusNow.resetAt,
    });

    if (!proxied.ok) {
      return new Response(JSON.stringify(data), { status: proxied.status, headers });
    }
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e: any) {
    const statusNow = await getRateStatus(ip);
    const headers = new Headers({
      "Content-Type": "application/json",
      "X-RateLimit-Limit": String(statusNow.limit),
      "X-RateLimit-Remaining": String(statusNow.remaining),
      "X-RateLimit-Reset": statusNow.resetAt,
    });
    return new Response(
      JSON.stringify({ error: "Error consultando API externa", detail: String(e?.message || e) }),
      { status: 502, headers }
    );
  }
}