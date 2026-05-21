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

async function sendWhatsAppMessage(evoUrl, evoKey, instance, phone, text) {
  const normalized = phone.replace(/\D/g, '');
  const number = normalized.startsWith('55') ? normalized : `55${normalized}`;
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

    // Load campaign
    const campaign = await base44.asServiceRole.entities.WhatsappCampaign.get(campaign_id);
    if (!campaign) return Response.json({ error: 'Campanha não encontrada' }, { status: 404 });

    // Load Evolution API settings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const sm = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});

    let EVO_URL = sm['EVOLUTION_API_URL'] || '';
    if (EVO_URL && !EVO_URL.startsWith('http')) EVO_URL = 'http://' + EVO_URL;
    EVO_URL = EVO_URL.replace(/\/$/, '');
    const EVO_KEY = sm['EVOLUTION_API_KEY'] || Deno.env.get('EVOLUTION_API_KEY') || '';
    const INSTANCE = sm['EVOLUTION_INSTANCE_NAME'] || '';

    if (!EVO_URL || !EVO_KEY || !INSTANCE) {
      return Response.json({ error: 'Evolution API não configurada. Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME nas Configurações.' }, { status: 400 });
    }

    // Update campaign status to "enviando"
    await base44.asServiceRole.entities.WhatsappCampaign.update(campaign_id, {
      status: 'enviando',
    });

    const delayMs = (campaign.delay_seconds ?? 5) * 1000;
    let sent = 0;
    let errors = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      if (!contact.phone) { errors++; continue; }

      const message = personalize(campaign.message_template, contact);

      try {
        await sendWhatsAppMessage(EVO_URL, EVO_KEY, INSTANCE, contact.phone, message);
        sent++;

        // Update contact stats
        await base44.asServiceRole.entities.Contact.update(contact.id, {
          last_whatsapp_sent: new Date().toISOString(),
          whatsapp_sent_count: (contact.whatsapp_sent_count || 0) + 1,
          status: contact.status === 'novo' ? 'contato_feito' : contact.status,
        });
      } catch (e) {
        console.error(`Erro ao enviar para ${contact.phone}:`, e.message);
        errors++;
      }

      // Delay between messages (skip last)
      if (i < contacts.length - 1 && delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    // Final campaign update
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