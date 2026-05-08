import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getEvoConfig(base44) {
  const settings = await base44.asServiceRole.entities.AppSettings.list();
  const get = (key) => (settings.find(s => s.key === key) || {}).value || Deno.env.get(key) || '';
  return {
    url: get('EVOLUTION_API_URL'),
    key: get('EVOLUTION_API_KEY'),
    instance: get('EVOLUTION_INSTANCE_NAME'),
  };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { action, payload } = await req.json();
  const cfg = await getEvoConfig(base44);

  function evoHeaders() {
    return { "Content-Type": "application/json", "apikey": cfg.key };
  }

  async function evoFetch(path, method = "GET", body = null) {
    const opts = { method, headers: evoHeaders() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${cfg.url}${path}`, opts);
    return res.json();
  }

  // ── CREATE INSTANCE ─────────────────────────────────────────────────────────
  if (action === "createInstance") {
    const data = await evoFetch(`/instance/create`, "POST", {
      instanceName: cfg.instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    });
    return Response.json(data);
  }

  // ── GET QR CODE ──────────────────────────────────────────────────────────────
  if (action === "getQrCode") {
    const data = await evoFetch(`/instance/connect/${cfg.instance}`);
    return Response.json(data);
  }

  // ── GET CONNECTION STATUS ────────────────────────────────────────────────────
  if (action === "getStatus") {
    const data = await evoFetch(`/instance/connectionState/${cfg.instance}`);
    return Response.json(data);
  }

  // ── DISCONNECT ───────────────────────────────────────────────────────────────
  if (action === "disconnect") {
    const data = await evoFetch(`/instance/logout/${cfg.instance}`, "DELETE");
    return Response.json(data);
  }

  // ── SEND TEXT MESSAGE ────────────────────────────────────────────────────────
  if (action === "sendMessage") {
    const { phone, text } = payload;
    const normalized = phone.replace(/\D/g, "");
    const number = normalized.startsWith("55") ? normalized : `55${normalized}`;
    const data = await evoFetch(`/message/sendText/${cfg.instance}`, "POST", {
      number,
      text,
    });
    return Response.json(data);
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});