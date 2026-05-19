import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── HELPERS ──────────────────────────────────────────────────────────────────

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

async function getSettings(base44) {
  const settings = await base44.asServiceRole.entities.AppSettings.list();
  const get = (key) => (settings.find(s => s.key === key) || {}).value || Deno.env.get(key) || '';
  return {
    evoUrl: get('EVOLUTION_API_URL'),
    evoKey: get('EVOLUTION_API_KEY'),
    evoInstance: get('EVOLUTION_INSTANCE_NAME'),
    webhookSecret: get('WEBHOOK_SECRET'),
    schedulingLink: get('scheduling_link'),
    schedulingMsg: get('scheduling_message'),
  };
}

async function sendWhatsApp(cfg, phone, text) {
  const res = await fetch(`${cfg.evoUrl}/message/sendText/${cfg.evoInstance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": cfg.evoKey },
    body: JSON.stringify({ number: phone, text }),
  });
  return res.json();
}

// ── NORMALIZE PAYLOAD FROM DIFFERENT SOURCES ─────────────────────────────────
// Supports: Typeform, RD Station, generic JSON, and custom forms
function extractLeadData(body) {
  // ── Typeform ────────────────────────────────────────────────────────────────
  if (body.form_response || body.event_type === "form_response") {
    const answers = body.form_response?.answers || [];
    const fields = body.form_response?.definition?.fields || [];
    const data = {};
    answers.forEach((ans) => {
      const field = fields.find(f => f.id === ans.field?.id);
      const label = (field?.title || '').toLowerCase();
      const val = ans.text || ans.email || ans.phone_number || ans.number?.toString() || '';
      if (/nome|name/.test(label)) data.name = val;
      else if (/e.?mail/.test(label)) data.email = val;
      else if (/fone|phone|whatsapp|celular|telefone/.test(label)) data.phone = val;
      else if (/partido|party/.test(label)) data.party_name = val;
      else if (/sigla|acronym/.test(label)) data.party_acronym = val;
      else if (/cargo|role/.test(label)) data.role = val;
      else if (/cidade|city/.test(label)) data.city = val;
      else if (/estado|state|uf/.test(label)) data.state = val;
    });
    data.source = 'formulario_web';
    return data;
  }

  // ── RD Station ─────────────────────────────────────────────────────────────
  if (body.leads && Array.isArray(body.leads)) {
    const lead = body.leads[0] || {};
    return {
      name: lead.name,
      email: lead.email,
      phone: lead.mobile_phone || lead.personal_phone,
      city: lead.city,
      state: lead.state,
      source: 'formulario_web',
    };
  }

  // ── Generic / custom form ──────────────────────────────────────────────────
  return {
    name: body.name || body.nome || body.full_name,
    email: body.email || body.e_mail,
    phone: body.phone || body.fone || body.telefone || body.whatsapp || body.celular,
    party_name: body.party_name || body.partido,
    party_acronym: body.party_acronym || body.sigla,
    role: body.role || body.cargo,
    city: body.city || body.cidade,
    state: body.state || body.estado || body.uf,
    notes: body.notes || body.mensagem || body.message || body.observacoes,
    source: 'formulario_web',
  };
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "GET") {
    return Response.json({ status: "Lead Webhook active", version: "1.0" });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // External webhook — use createClientFromRequest, access entities via asServiceRole only
  const base44 = createClientFromRequest(req);
  const cfg = await getSettings(base44);

  // ── Secret validation (obrigatório) ───────────────────────────────────────
  const headerSecret = req.headers.get("x-webhook-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!cfg.webhookSecret || headerSecret !== cfg.webhookSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lead = extractLeadData(body);

  if (!lead.email && !lead.phone) {
    return Response.json({ error: "Lead must have at least email or phone" }, { status: 422 });
  }

  // ── Find or create contact ─────────────────────────────────────────────────
  let contact = null;

  if (lead.email) {
    const found = await base44.asServiceRole.entities.Contact.filter({ email: lead.email });
    contact = found?.[0] || null;
  }

  if (!contact && lead.phone) {
    const normalized = normalizePhone(lead.phone);
    if (normalized) {
      const found = await base44.asServiceRole.entities.Contact.filter({ phone: normalized });
      contact = found?.[0] || null;
      if (!contact) {
        // Try without country code
        const withoutCC = normalized.startsWith("55") ? normalized.slice(2) : normalized;
        const found2 = await base44.asServiceRole.entities.Contact.filter({ phone: withoutCC });
        contact = found2?.[0] || null;
      }
    }
  }

  const contactData = {
    name: lead.name || contact?.name,
    email: lead.email || contact?.email,
    phone: normalizePhone(lead.phone) || lead.phone || contact?.phone,
    party_name: lead.party_name || contact?.party_name,
    party_acronym: lead.party_acronym || contact?.party_acronym,
    role: lead.role || contact?.role,
    city: lead.city || contact?.city,
    state: lead.state || contact?.state,
    notes: lead.notes || contact?.notes,
    source: lead.source || 'formulario_web',
    status: contact?.status || 'novo',
    tags: [...new Set([...(contact?.tags || []), 'Lead_Web'])],
  };

  if (!contact) {
    contact = await base44.asServiceRole.entities.Contact.create(contactData);
  } else {
    // Only update non-null fields
    const updates = {};
    Object.entries(contactData).forEach(([k, v]) => { if (v !== undefined && v !== null) updates[k] = v; });
    await base44.asServiceRole.entities.Contact.update(contact.id, updates);
    contact = { ...contact, ...updates };
  }

  // ── Send WhatsApp welcome message ──────────────────────────────────────────
  const phone = normalizePhone(lead.phone || contact.phone);
  let whatsappSent = false;
  let whatsappError = null;

  if (phone && cfg.evoUrl && cfg.evoKey && cfg.evoInstance) {
    const firstName = (contact.name || '').split(' ')[0] || 'prezado(a)';
    const partyInfo = contact.party_name ? ` do ${contact.party_name}${contact.party_acronym ? ` (${contact.party_acronym})` : ''}` : '';

    const welcomeMsg =
`Olá, *${firstName}*! 👋

Recebemos seu contato${partyInfo} e ficamos felizes em conhecê-lo!

Sou o assistente virtual do escritório do *Dr. Marcos Eduardo*, especialista em direito eleitoral e partidário. 

Posso ajudá-lo com:
• 📋 Regularização de CNPJ partidário
• 📊 Prestação de contas 2025 (TSE/TRE)
• ⚖️ Adequação estatutária
• 🛡️ Recursos e defesas administrativas

Qual é a principal necessidade do seu diretório hoje?`;

    try {
      await sendWhatsApp(cfg, phone, welcomeMsg);
      whatsappSent = true;

      // Send scheduling link if configured
      if (cfg.schedulingLink) {
        const schedulingText = cfg.schedulingMsg
          ? `${cfg.schedulingMsg}\n\n${cfg.schedulingLink}`
          : `📅 *Diagnóstico Gratuito*\n\nAgende uma conversa de 30 min com o Dr. Marcos Eduardo:\n${cfg.schedulingLink}`;

        await sendWhatsApp(cfg, phone, schedulingText);
        await base44.asServiceRole.entities.Contact.update(contact.id, {
          tags: [...new Set([...(contact.tags || []), 'Lead_Web', 'Agendamento_Enviado', 'Boas_Vindas_Enviada'])],
          status: 'contato_feito',
        });
      } else {
        await base44.asServiceRole.entities.Contact.update(contact.id, {
          tags: [...new Set([...(contact.tags || []), 'Lead_Web', 'Boas_Vindas_Enviada'])],
          status: 'contato_feito',
        });
      }
    } catch (err) {
      whatsappError = err.message;
    }
  }

  // ── Fire lead automation rules ────────────────────────────────────────────
  let campaignsFired = [];
  try {
    const rules = await base44.asServiceRole.entities.LeadAutomationRule.filter({ active: true });
    const matchingRules = rules.filter(rule => {
      // Trigger check
      if (rule.trigger === 'new_lead_with_email' && !contact.email) return false;
      if (rule.trigger === 'new_lead_with_phone' && !normalizePhone(contact.phone)) return false;
      // State filter
      if (rule.filter_state && contact.state && contact.state.toUpperCase() !== rule.filter_state.toUpperCase()) return false;
      return true;
    });

    for (const rule of matchingRules) {
      const campaign = await base44.asServiceRole.entities.Campaign.get(rule.campaign_id).catch(() => null);
      if (!campaign || !campaign.html_body || !contact.email) continue;

      // Send once per contact check: use tags
      const sentTag = `CampanhaEnviada_${rule.campaign_id}`;
      if (rule.send_once_per_contact && contact.tags?.includes(sentTag)) continue;

      // Personalize and send email
      const personalize = (html) => html
        .replace(/\{\{nome_responsavel\}\}/g, contact.name || 'Prezado(a)')
        .replace(/\{\{nome_partido\}\}/g, contact.party_name || '')
        .replace(/\{\{sigla_partido\}\}/g, contact.party_acronym || '')
        .replace(/\{\{cidade\}\}/g, contact.city || '')
        .replace(/\{\{estado\}\}/g, contact.state || '');

      const subject = campaign.subject_a || 'Mensagem importante sobre seu partido';
      const senderName = campaign.sender_name || 'Marcos Eduardo - Contador Partidário e Eleitoral';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: contact.email,
        subject: personalize(subject),
        body: personalize(campaign.html_body),
        from_name: senderName,
      });

      // Update rule execution count
      await base44.asServiceRole.entities.LeadAutomationRule.update(rule.id, {
        executions_count: (rule.executions_count || 0) + 1,
        last_executed: new Date().toISOString(),
      });

      // Tag contact as sent
      const updatedTags = [...new Set([...(contact.tags || []), sentTag, 'Email_Automacao_Enviado'])];
      await base44.asServiceRole.entities.Contact.update(contact.id, { tags: updatedTags });
      contact = { ...contact, tags: updatedTags };

      campaignsFired.push(campaign.name);
    }
  } catch (automationErr) {
    console.error('Automation error:', automationErr.message);
  }

  return Response.json({
    ok: true,
    contact_id: contact.id,
    whatsapp_sent: whatsappSent,
    whatsapp_error: whatsappError,
    phone_used: phone,
    campaigns_fired: campaignsFired,
  });
});