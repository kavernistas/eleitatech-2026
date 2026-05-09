import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em direito eleitoral e partidário brasileiro, 
representando o escritório do Dr. Marcos Eduardo. 
Seu foco são os serviços:
1. Regularização de CNPJ partidário (pendências 2024)
2. Prestação de contas 2025 (TSE/TRE)
3. Adequação estatutária
4. Recursos e defesas administrativas

Seja cordial, profissional e objetivo. Use linguagem acessível. 
Quando o lead demonstrar interesse real em contratar ou tiver dúvida jurídica muito complexa, 
encerre com: [HANDOVER_NEEDED] para transferir ao Marcos.
Quando receber um documento, responda mencionando que o Marcos irá analisar pessoalmente.
Limite suas respostas a 3-4 parágrafos curtos (WhatsApp).`;

const INTENT_PROMPT = `Analise a mensagem de WhatsApp de um lead de diretório partidário e retorne um JSON com:
- "interest_area": um dos valores: "regularizacao_cnpj", "contas_2025", "ambos", "outros", "nenhum"
- "intent_score": 0 a 10 (0=sem interesse, 10=quer contratar já)
- "tags": array de strings relevantes (ex: ["Urgente", "CNPJ", "Contas 2025", "Pendência 2024"])
- "suggested_status": um dos valores: "contato_feito", "interessado", "proposta_enviada", "atendimento_humano" (baseado no nível de interesse)

Considere:
- "interessado" quando o lead faz perguntas sobre preços, prazos, ou serviços específicos
- "proposta_enviada" quando o lead pede formalmente uma proposta ou orçamento
- "atendimento_humano" quando o lead quer falar com um humano ou demonstra urgência extrema
- Tags "Urgente" se mencionar prazo ou urgência
- Tags "CNPJ" se mencionar CNPJ, regularização, Receita Federal
- Tags "Contas 2025" se mencionar prestação de contas, TSE, TRE, contabilidade

Retorne APENAS o JSON, sem explicações.`;

async function callOpenAI(messages, jsonMode = false) {
  const body = {
    model: "gpt-4o-mini",
    messages,
    max_tokens: jsonMode ? 300 : 500,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function analyzeIntent(messageText) {
  try {
    const raw = await callOpenAI([
      { role: "system", content: INTENT_PROMPT },
      { role: "user", content: messageText },
    ], true);
    return JSON.parse(raw);
  } catch {
    return { interest_area: "nenhum", intent_score: 0, tags: [], suggested_status: "contato_feito" };
  }
}

async function sendWhatsApp(evoUrl, evoKey, instance, phone, text) {
  const normalized = phone.replace(/\D/g, "");
  const number = normalized.startsWith("55") ? normalized : `55${normalized}`;
  await fetch(`${evoUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": evoKey },
    body: JSON.stringify({ number, text }),
  });
}

// Try to find contact by multiple phone formats
async function findContactByPhone(base44, phone) {
  const normalized = phone.replace(/\D/g, "");
  const withCountry = normalized.startsWith("55") ? normalized : `55${normalized}`;
  const withoutCountry = withCountry.startsWith("55") ? withCountry.slice(2) : normalized;

  // Try all variants
  for (const variant of [withCountry, withoutCountry, normalized]) {
    const results = await base44.asServiceRole.entities.Contact.filter({ phone: variant });
    if (results?.[0]) return results[0];
  }
  return null;
}

// Determine new status based on intent analysis and current status
function resolveStatus(currentStatus, suggestedStatus) {
  const statusRank = {
    novo: 0, contato_feito: 1, interessado: 2,
    proposta_enviada: 3, fechado: 4, atendimento_humano: 5, inativo: -1,
  };
  const current = statusRank[currentStatus] ?? 0;
  const suggested = statusRank[suggestedStatus] ?? 1;
  // Only advance status, never downgrade (except handover)
  if (suggestedStatus === "atendimento_humano") return "atendimento_humano";
  return suggested > current ? suggestedStatus : currentStatus;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return Response.json({ ok: true });

  const expectedSecret = Deno.env.get("WEBHOOK_SECRET");
  const receivedSecret = req.headers.get("x-webhook-secret");
  if (expectedSecret && receivedSecret !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // External webhook — use createClientFromRequest, access via asServiceRole only
  const base44 = createClientFromRequest(req);

  // Load Evolution API config from AppSettings (fallback to env vars)
  const appSettingsAll = await base44.asServiceRole.entities.AppSettings.list();
  const getSetting = (key) => (appSettingsAll.find(s => s.key === key) || {}).value || Deno.env.get(key) || '';
  let EVO_URL = getSetting('EVOLUTION_API_URL');
  if (EVO_URL && !EVO_URL.startsWith('http')) EVO_URL = 'http://' + EVO_URL;
  EVO_URL = EVO_URL.replace(/\/$/, '');
  const EVO_KEY = getSetting('EVOLUTION_API_KEY');
  const INSTANCE = getSetting('EVOLUTION_INSTANCE_NAME');
  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: true }); }

  // Evolution API webhook payload
  const event = body.event;
  if (event !== "messages.upsert") return Response.json({ ok: true });

  const msg = body.data;
  if (!msg || msg.key?.fromMe) return Response.json({ ok: true }); // ignore own messages

  const senderPhone = msg.key?.remoteJid?.replace("@s.whatsapp.net", "") || "";
  const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
  const hasMedia = !!(msg.message?.imageMessage || msg.message?.documentMessage || msg.message?.audioMessage);
  const senderName = msg.pushName || senderPhone;

  if (!senderPhone) return Response.json({ ok: true });

  // Find or create contact
  let contact = await findContactByPhone(base44, senderPhone);
  if (!contact) {
    contact = await base44.asServiceRole.entities.Contact.create({
      phone: senderPhone,
      name: senderName,
      source: "whatsapp",
      status: "novo",
      whatsapp_conversation: [],
    });
  }

  const conversation = [...(contact.whatsapp_conversation || [])];

  // Add incoming message to conversation history
  conversation.push({
    role: "user",
    content: hasMedia ? "[Documento/Mídia recebida]" : messageText,
    ts: new Date().toISOString(),
  });

  // ── MEDIA HANDLER ────────────────────────────────────────────────────────────
  if (hasMedia) {
    const tags = [...new Set([...(contact.tags || []), "Documento_Recebido"])];
    await base44.asServiceRole.entities.Contact.update(contact.id, {
      whatsapp_conversation: conversation,
      tags,
      status: resolveStatus(contact.status, "interessado"),
    });
    await sendWhatsApp(EVO_URL, EVO_KEY, INSTANCE, senderPhone, "Recebemos seu documento! O Dr. Marcos Eduardo irá analisá-lo pessoalmente e retornará em breve. 📋");
    return Response.json({ ok: true });
  }

  // ── HUMAN HANDOVER: just save message, Marcos handles ───────────────────────
  if (contact.status === "atendimento_humano") {
    await base44.asServiceRole.entities.Contact.update(contact.id, {
      whatsapp_conversation: conversation,
    });
    return Response.json({ ok: true });
  }

  // ── LOAD SCHEDULING LINK FROM APP SETTINGS (already loaded above) ────────────
  const schedulingLink = appSettingsAll.find(s => s.key === 'scheduling_link')?.value || '';
  const schedulingMsg = appSettingsAll.find(s => s.key === 'scheduling_message')?.value || '';

  // ── PARALLEL: AI reply + intent analysis ────────────────────────────────────
  const historyForAI = conversation.slice(-10).map(m => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const [aiReply, intentData] = await Promise.all([
    callOpenAI([{ role: "system", content: SYSTEM_PROMPT }, ...historyForAI]),
    analyzeIntent(messageText),
  ]);

  const needsHandover = aiReply.includes("[HANDOVER_NEEDED]");
  const cleanReply = aiReply.replace("[HANDOVER_NEEDED]", "").trim();

  // Add AI reply to conversation
  conversation.push({ role: "assistant", content: cleanReply, ts: new Date().toISOString() });

  // ── MERGE TAGS (no duplicates) ───────────────────────────────────────────────
  const existingTags = contact.tags || [];
  const newTags = intentData.tags || [];
  const mergedTags = [...new Set([...existingTags, ...newTags])];

  // ── RESOLVE STATUS ───────────────────────────────────────────────────────────
  const finalStatus = needsHandover
    ? "atendimento_humano"
    : resolveStatus(contact.status, intentData.suggested_status || "contato_feito");

  // ── BUILD UPDATE PAYLOAD ─────────────────────────────────────────────────────
  const updateData = {
    whatsapp_conversation: conversation,
    status: finalStatus,
    tags: mergedTags,
  };

  // Update interest_area only if more specific than current
  const interestRank = { nenhum: 0, outros: 1, regularizacao_cnpj: 2, contas_2025: 2, ambos: 3 };
  const currentInterest = contact.interest_area || "nenhum";
  if ((interestRank[intentData.interest_area] || 0) > (interestRank[currentInterest] || 0)) {
    updateData.interest_area = intentData.interest_area;
  }

  // Generate AI summary when handing over or high intent
  if (needsHandover || intentData.intent_score >= 7) {
    updateData.ai_summary = `[Score: ${intentData.intent_score}/10] Interesse: ${intentData.interest_area}. Última msg: "${messageText.substring(0, 120)}"`;
  }

  await base44.asServiceRole.entities.Contact.update(contact.id, updateData);

  // Send AI reply via WhatsApp
  await sendWhatsApp(EVO_URL, EVO_KEY, INSTANCE, senderPhone, cleanReply);

  // ── AUTO SCHEDULING: send link when high intent & not yet in handover ────────
  const isHighIntent = intentData.intent_score >= 7;
  const notYetScheduled = !contact.tags?.includes('Agendamento_Enviado');
  if (isHighIntent && schedulingLink && notYetScheduled && finalStatus !== 'atendimento_humano') {
    const schedulingText = schedulingMsg
      ? `${schedulingMsg}\n\n${schedulingLink}`
      : `📅 *Reunião de Diagnóstico Gratuita*\n\nPercebo seu interesse! Que tal agendarmos uma conversa de 30 minutos com o Dr. Marcos Eduardo?\n\n👇 Escolha o melhor horário:\n${schedulingLink}`;
    await sendWhatsApp(EVO_URL, EVO_KEY, INSTANCE, senderPhone, schedulingText);
    // Tag contact so we don't send again
    updateData.tags = [...new Set([...(updateData.tags || mergedTags), 'Agendamento_Enviado'])];
    await base44.asServiceRole.entities.Contact.update(contact.id, { tags: updateData.tags });
  }

  return Response.json({ ok: true });
});