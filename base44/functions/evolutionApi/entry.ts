import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EVO_URL = Deno.env.get("EVOLUTION_API_URL");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY");
const INSTANCE = Deno.env.get("EVOLUTION_INSTANCE_NAME");

function evoHeaders() {
  return { "Content-Type": "application/json", "apikey": EVO_KEY };
}

async function evoFetch(path, method = "GET", body = null) {
  const opts = { method, headers: evoHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${EVO_URL}${path}`, opts);
  return res.json();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { action, payload } = await req.json();

  // ── CREATE INSTANCE ─────────────────────────────────────────────────────────
  if (action === "createInstance") {
    const data = await evoFetch(`/instance/create`, "POST", {
      instanceName: INSTANCE,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    });
    return Response.json(data);
  }

  // ── GET QR CODE ──────────────────────────────────────────────────────────────
  if (action === "getQrCode") {
    const data = await evoFetch(`/instance/connect/${INSTANCE}`);
    return Response.json(data);
  }

  // ── GET CONNECTION STATUS ────────────────────────────────────────────────────
  if (action === "getStatus") {
    const data = await evoFetch(`/instance/connectionState/${INSTANCE}`);
    return Response.json(data);
  }

  // ── DISCONNECT ───────────────────────────────────────────────────────────────
  if (action === "disconnect") {
    const data = await evoFetch(`/instance/logout/${INSTANCE}`, "DELETE");
    return Response.json(data);
  }

  // ── SEND TEXT MESSAGE ────────────────────────────────────────────────────────
  if (action === "sendMessage") {
    const { phone, text } = payload;
    // Normalize phone: remove non-digits, ensure country code
    const normalized = phone.replace(/\D/g, "");
    const number = normalized.startsWith("55") ? normalized : `55${normalized}`;
    const data = await evoFetch(`/message/sendText/${INSTANCE}`, "POST", {
      number,
      text,
    });
    return Response.json(data);
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});