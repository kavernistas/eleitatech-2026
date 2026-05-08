import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  // Read body FIRST before any async operations
  const { action, payload } = await req.json();

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Load config from AppSettings, fall back to env vars
  const settings = await base44.asServiceRole.entities.AppSettings.list();
  const getSetting = (key) => (settings.find(s => s.key === key) || {}).value || Deno.env.get(key) || '';

  const EVO_URL = getSetting('EVOLUTION_API_URL');
  const EVO_KEY = getSetting('EVOLUTION_API_KEY');
  const INSTANCE = getSetting('EVOLUTION_INSTANCE_NAME');

  function evoHeaders() {
    return { "Content-Type": "application/json", "apikey": EVO_KEY };
  }

  async function evoFetch(path, method = "GET", body = null) {
    const opts = { method, headers: evoHeaders() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${EVO_URL}${path}`, opts);
    return res.json();
  }

  if (action === "createInstance") {
    const data = await evoFetch(`/instance/create`, "POST", {
      instanceName: INSTANCE,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    });
    return Response.json(data);
  }

  if (action === "getQrCode") {
    const data = await evoFetch(`/instance/connect/${INSTANCE}`);
    return Response.json(data);
  }

  if (action === "getStatus") {
    const data = await evoFetch(`/instance/connectionState/${INSTANCE}`);
    return Response.json(data);
  }

  if (action === "disconnect") {
    const data = await evoFetch(`/instance/logout/${INSTANCE}`, "DELETE");
    return Response.json(data);
  }

  if (action === "sendMessage") {
    const { phone, text } = payload;
    const normalized = phone.replace(/\D/g, "");
    const number = normalized.startsWith("55") ? normalized : `55${normalized}`;
    const data = await evoFetch(`/message/sendText/${INSTANCE}`, "POST", { number, text });
    return Response.json(data);
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});