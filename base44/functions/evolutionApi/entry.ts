import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let action, payload;
  try {
    const body = await req.json();
    action = body.action;
    payload = body.payload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Load config from AppSettings, fall back to env vars
  const settings = await base44.asServiceRole.entities.AppSettings.list();
  const getSetting = (key) => (settings.find(s => s.key === key) || {}).value || Deno.env.get(key) || '';

  let EVO_URL = getSetting('EVOLUTION_API_URL');
  if (EVO_URL && !EVO_URL.startsWith('http')) EVO_URL = 'http://' + EVO_URL;
  EVO_URL = EVO_URL.replace(/\/$/, '');
  const EVO_KEY = getSetting('EVOLUTION_API_KEY');
  const INSTANCE = getSetting('EVOLUTION_INSTANCE_NAME');

  if (!EVO_URL || !EVO_KEY || !INSTANCE) {
    return Response.json({ error: "Evolution API não configurada. Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME em Configurações → Integrações." }, { status: 400 });
  }

  const evoHeaders = () => ({ "Content-Type": "application/json", "apikey": EVO_KEY });

  const evoFetch = async (path, method = "GET", body = null) => {
    const opts = { method, headers: evoHeaders() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${EVO_URL}${path}`, opts);
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { raw: text, status: res.status }; }
  };

  try {
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
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});