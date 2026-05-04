import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
const EVO_URL = Deno.env.get("EVOLUTION_API_URL");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY");
const INSTANCE = Deno.env.get("EVOLUTION_INSTANCE_NAME");

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

async function callOpenAI(messages) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 500 }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function sendWhatsApp(phone, text) {
  const normalized = phone.replace(/\D/g, "");
  const number = normalized.startsWith("55") ? normalized : `55${normalized}`;
  await fetch(`${EVO_URL}/message/sendText/${INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
    body: JSON.stringify({ number, text }),
  });
}

Deno.serve(async (req) => {
  // Evolution API sends POST webhooks
  if (req.method !== "POST") return Response.json({ ok: true });

  const base44 = createClientFromRequest(req);
  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: true }); }

  // Evolution API webhook payload structure
  const event = body.event;
  if (event !== "messages.upsert") return Response.json({ ok: true });

  const msg = body.data;
  if (!msg || msg.key?.fromMe) return Response.json({ ok: true }); // ignore own messages

  const senderPhone = msg.key?.remoteJid?.replace("@s.whatsapp.net", "") || "";
  const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
  const hasMedia = !!(msg.message?.imageMessage || msg.message?.documentMessage || msg.message?.audioMessage);
  const senderName = msg.pushName || senderPhone;

  if (!senderPhone) return Response.json({ ok: true });

  // Find contact in DB
  const contacts = await base44.asServiceRole.entities.Contact.filter({ phone: senderPhone });
  let contact = contacts?.[0] || null;

  // If contact doesn't exist, create it
  if (!contact) {
    contact = await base44.asServiceRole.entities.Contact.create({
      phone: senderPhone,
      name: senderName,
      source: "whatsapp",
      status: "novo",
      whatsapp_conversation: [],
    });
  }

  const conversation = contact.whatsapp_conversation || [];

  // Add incoming message to conversation
  const incomingMsg = {
    role: "user",
    content: hasMedia ? `[Documento recebido]` : messageText,
    ts: new Date().toISOString(),
  };
  conversation.push(incomingMsg);

  // Handle media: tag contact
  if (hasMedia) {
    const tags = [...(contact.tags || [])];
    if (!tags.includes("Documento_Recebido")) tags.push("Documento_Recebido");
    await base44.asServiceRole.entities.Contact.update(contact.id, {
      whatsapp_conversation: conversation,
      tags,
    });
    await sendWhatsApp(senderPhone, "Recebemos seu documento! O Dr. Marcos Eduardo irá analisá-lo pessoalmente e retornará em breve. 📋");
    return Response.json({ ok: true });
  }

  // If status is atendimento_humano, just save the message (Marcos handles it)
  if (contact.status === "atendimento_humano") {
    await base44.asServiceRole.entities.Contact.update(contact.id, {
      whatsapp_conversation: conversation,
    });
    return Response.json({ ok: true });
  }

  // Build OpenAI messages from conversation history (last 10)
  const historyForAI = conversation.slice(-10).map(m => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));
  const aiMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...historyForAI];

  // Call AI
  const aiReply = await callOpenAI(aiMessages);
  const needsHandover = aiReply.includes("[HANDOVER_NEEDED]");
  const cleanReply = aiReply.replace("[HANDOVER_NEEDED]", "").trim();

  // Add AI reply to conversation
  const aiMsg = { role: "assistant", content: cleanReply, ts: new Date().toISOString() };
  conversation.push(aiMsg);

  // Update contact
  const updateData = { whatsapp_conversation: conversation };
  if (needsHandover) {
    updateData.status = "atendimento_humano";
    updateData.ai_summary = `Lead solicitou atenção especial. Última mensagem: "${messageText.substring(0, 100)}"`;
  } else if (contact.status === "novo") {
    updateData.status = "contato_feito";
  }

  await base44.asServiceRole.entities.Contact.update(contact.id, updateData);

  // Send AI reply via WhatsApp
  await sendWhatsApp(senderPhone, cleanReply);

  return Response.json({ ok: true });
});