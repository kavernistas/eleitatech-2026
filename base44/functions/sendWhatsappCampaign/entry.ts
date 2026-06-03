import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function personalize(template, contact) {
  return (template || '')
    .replace(/\{\{nome_responsavel\}\}/g, contact.name || 'Prezado(a)')
    .replace(/\{\{nome_partido\}\}/g, contact.party_name || '')
    .replace(/\{\{sigla_partido\}\}/g, contact.party_acronym || '')
    .replace(/\{\{cidade\}\}/g, contact.city || '')
    .replace(/\{\{estado\}\}/g, contact.state || '')
    .replace(/\{\{telefone\}\}/g, contact.phone || '');
}

function extractFirstPhone(phone) {
  const first = (phone || '').split(/[\/|,]/)[0].trim();
  const normalized = first.replace(/\D/g, '');
  return normalized.startsWith('55') ? normalized : `55${normalized}`;
}

async function sendWhatsAppMessage(evoUrl, evoKey, instance, phone, text) {
  const number = extractFirstPhone(phone);
  if (!number || number.length < 10) throw new Error(`Telefone inválido: ${phone}`);
  const res = await fetch(`${evoUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
    body: JSON.stringify({ number, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API error ${res.status}: ${err}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { campaign_id, contacts } = body;

    if (!campaign_id || !contacts?.length) {
      return Response.json({ error: 'campaign_id e contacts são obrigatórios' }, { status: 400 });
    }

    const campaign = await base44.asServiceRole.entities.WhatsappCampaign.get(campaign_id);
    if (!campaign) return Response.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const sm = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});

    let EVO_URL = sm['EVOLUTION_API_URL'] || '';
    if (EVO_URL && !EVO_URL.startsWith('http')) EVO_URL = 'http://' + EVO_URL;
    EVO_URL = EVO_URL.replace(/\/$/, '');
    const EVO_KEY = sm['EVOLUTION_API_KEY'] || Deno.env.get('EVOLUTION_API_KEY') || '';
    const INSTANCE = sm['EVOLUTION_INSTANCE_NAME'] || '';

    if (!EVO_URL || !EVO_KEY || !INSTANCE) {
      return Response.json({ error: 'Evolution API não configurada.' }, { status: 400 });
    }

    await base44.asServiceRole.entities.WhatsappCampaign.update(campaign_id, { status: 'enviando' });

    // Lógica: 15s entre cada mensagem, pausa de 20min a cada 20 mensagens
    const BATCH_SIZE = 20;
    const MSG_INTERVAL_MS = 15 * 1000;      // 15 segundos
    const PAUSE_MS = 20 * 60 * 1000;        // 20 minutos
    let sent = 0;
    let errors = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      if (!contact.phone) { errors++; continue; }

      const message = personalize(campaign.message_template, contact);

      try {
        await sendWhatsAppMessage(EVO_URL, EVO_KEY, INSTANCE, contact.phone, message);
        sent++;
        await base44.asServiceRole.entities.Contact.update(contact.id, {
          last_whatsapp_sent: new Date().toISOString(),
          whatsapp_sent_count: (contact.whatsapp_sent_count || 0) + 1,
          status: contact.status === 'novo' ? 'contato_feito' : contact.status,
        });
      } catch (e) {
        console.error(`Erro ao enviar para ${contact.phone}:`, e.message);
        errors++;
      }

      const isLast = i === contacts.length - 1;
      if (!isLast) {
        if ((i + 1) % BATCH_SIZE === 0) {
          console.log(`Lote de ${BATCH_SIZE} enviado (total: ${sent}). Pausando 20 minutos...`);
          await new Promise(r => setTimeout(r, PAUSE_MS));
        } else {
          await new Promise(r => setTimeout(r, MSG_INTERVAL_MS));
        }
      }
    }

    await base44.asServiceRole.entities.WhatsappCampaign.update(campaign_id, {
      status: 'enviado',
      total_sent: sent,
      total_errors: errors,
      sent_at: new Date().toISOString(),
    });

    return Response.json({ success: true, sent, errors });
  } catch (error) {
    console.error('sendWhatsappCampaign error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});