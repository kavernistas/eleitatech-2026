import { createClientFromRequest } from 'npm:@base44/sdk@0.8.28';

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

  // Encode instance name for URL (handles spaces and special chars)
  const INSTANCE_ENC = encodeURIComponent(INSTANCE);

  const evoHeaders = { "Content-Type": "application/json", "apikey": EVO_KEY };

  const evoFetch = async (path, method = "GET", body = null) => {
    const opts = { method, headers: evoHeaders };
    if (body) opts.body = JSON.stringify(body);
    const url = `${EVO_URL}${path}`;
    console.log(`[evoFetch] ${method} ${url}`);
    const res = await fetch(url, opts);
    const text = await res.text();
    console.log(`[evoFetch] → ${res.status}: ${text.substring(0, 200)}`);
    try { return { ...JSON.parse(text), _status: res.status }; } catch { return { raw: text, _status: res.status }; }
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
      const data = await evoFetch(`/instance/connect/${INSTANCE_ENC}`);
      return Response.json(data);
    }

    if (action === "getStatus") {
      const data = await evoFetch(`/instance/connectionState/${INSTANCE_ENC}`);
      return Response.json(data);
    }

    if (action === "disconnect") {
      const data = await evoFetch(`/instance/logout/${INSTANCE_ENC}`, "DELETE");
      return Response.json(data);
    }

    if (action === "sendMessage") {
      const { phone, text } = payload;
      const normalized = phone.replace(/\D/g, "");
      const number = normalized.startsWith("55") ? normalized : `55${normalized}`;
      const data = await evoFetch(`/message/sendText/${INSTANCE_ENC}`, "POST", { number, text });
      return Response.json(data);
    }

    // Debug: probe server health and auth
    if (action === "listInstances") {
      const baseUrl = EVO_URL;
      // Test 1: root ping (no auth)
      const rPing = await fetch(`${baseUrl}/`).catch(e => ({ status: -1, text: async () => e.message }));
      const tPing = await rPing.text();
      // Test 2: fetchInstances with apikey header
      const r1 = await fetch(`${baseUrl}/instance/fetchInstances`, { headers: { "apikey": EVO_KEY } });
      const t1 = await r1.text();
      // Test 3: try without any auth to see error format
      const r2 = await fetch(`${baseUrl}/instance/fetchInstances`);
      const t2 = await r2.text();
      return Response.json({
        ping: { status: rPing.status, body: tPing.substring(0, 200) },
        with_apikey: { status: r1.status, body: t1.substring(0, 400) },
        no_auth: { status: r2.status, body: t2.substring(0, 400) },
        EVO_URL: baseUrl,
        INSTANCE,
        key_length: EVO_KEY.length,
        key_preview: EVO_KEY.substring(0, 12) + '...',
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[evolutionApi] error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});