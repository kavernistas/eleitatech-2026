import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = Deno.env.get('APP_PUBLIC_URL') || 'https://eleita-tech-2026.base44.app';
const APP_ID = Deno.env.get('BASE44_APP_ID');
const TRACK_BASE = `https://backend.base44.app/api/apps/${APP_ID}/functions/trackEmail`;

function unsubscribeUrl(email) {
  const encoded = btoa(unescape(encodeURIComponent(email)));
  return `${APP_URL}/unsubscribe?e=${encoded}`;
}

function buildHtml(contact, tpl, waNumber = '5511999990000') {
  const name = contact.name || contact.party_name || 'Responsável';
  const party = contact.party_acronym || contact.party_name || '';
  const location = [contact.city, contact.state].filter(Boolean).join('/');
  const greeting = [party, location].filter(Boolean).join(' de ');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1a3a6b,#2d5fa6);padding:36px 40px;text-align:center;">
  <p style="margin:0 0 4px;color:#c8d8f0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Escritório Contábil</p>
  <h1 style="margin:0;color:#f0c040;font-size:22px;font-weight:700;">Marcos Eduardo</h1>
  <p style="margin:6px 0 0;color:#c8d8f0;font-size:13px;">Assessoria em Contabilidade Eleitoral · CRC/SP 151562/O-0</p>
  <p style="margin:4px 0 0;color:#a0b4cc;font-size:12px;">contato@marcoseduardocontabil.com.br</p>
</td></tr>
<tr><td style="padding:40px;">
  <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${tpl.headline}</p>
  <p style="margin:0 0 16px;font-size:16px;color:#1a3a6b;font-weight:600;">Olá, ${name}${greeting ? ' — ' + greeting : ''}!</p>
  <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">${tpl.body1}</p>
  <p style="margin:0 0 12px;font-size:15px;color:#444;line-height:1.7;">Nosso escritório é especializado em:</p>
  <div style="background:#f0f5ff;border-left:4px solid #2d5fa6;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:12px;">
    <strong style="color:#1a3a6b;font-size:14px;">${tpl.h1icon} ${tpl.h1title}</strong><br>
    <span style="color:#666;font-size:13px;">${tpl.h1sub}</span>
  </div>
  <div style="background:#f0f5ff;border-left:4px solid #f0c040;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:24px;">
    <strong style="color:#1a3a6b;font-size:14px;">${tpl.h2icon} ${tpl.h2title}</strong><br>
    <span style="color:#666;font-size:13px;">${tpl.h2sub}</span>
  </div>
  <table width="100%"><tr><td align="center" style="padding:8px 0 24px;">
    <a href="https://wa.me/${waNumber}?text=Ol%C3%A1%2C+vim+pelo+e-mail+sobre+regulariza%C3%A7%C3%A3o+partid%C3%A1ria"
       style="display:inline-block;background:#25D366;color:#fff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;">
      💬 Solicitar Diagnóstico Gratuito
    </a>

  </td></tr></table>
  <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
    Responda este e-mail ou acesse nosso WhatsApp para uma análise gratuita da situação do seu partido.
  </p>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e8ecf0;padding:20px 40px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#aaa;">Marcos Eduardo · Contador Partidário e Eleitoral · CRC/SP 151562/O-0</p>
  <p style="margin:4px 0 0;font-size:12px;color:#bbb;">Rua Suíça, 595 - Parque das Nações · Santo André - SP · CEP 09210-000</p>
  <p style="margin:4px 0 0;font-size:12px;color:#bbb;">contato@marcoseduardocontabil.com.br</p>
  <p style="margin:4px 0 0;font-size:11px;color:#ccc;">Você recebeu este e-mail pois seu diretório consta em nossa base de prospecção para 2026.</p>
  <p style="margin:8px 0 0;font-size:11px;color:#ccc;">Não deseja mais receber nossos e-mails? <a href="${unsubscribeUrl(contact.email)}" style="color:#1a3a6b;text-decoration:underline;">Clique aqui para se descadastrar</a>.</p>
  <p style="margin:10px 0 0;font-size:11px;color:#aaa;">Quer acessar nossa plataforma de gestão eleitoral? <a href="https://eleita-tech-2026.base44.app" style="color:#2d5fa6;font-weight:600;text-decoration:underline;">Cadastre-se no sistema LegalTech →</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const TEMPLATES = {
  prospeccao_cnpj: {
    headline: 'Pendência de CNPJ Identificada',
    body1: 'Identificamos que o seu diretório partidário pode ter <strong>pendências de regularização do CNPJ</strong> junto à Receita Federal e à Justiça Eleitoral para 2026.',
    h1icon: '📋', h1title: 'Regularização de CNPJ Partidário', h1sub: 'Pendências 2024 · Baixa de débitos · Adequação cadastral',
    h2icon: '📊', h2title: 'Prestação de Contas 2025 (TSE/TRE)', h2sub: 'Relatórios · Adequação · Recursos administrativos',
    subject: (c) => `${c.party_acronym || c.party_name || 'Diretório'} - Regularização CNPJ 2026 - Diagnóstico Gratuito`,
  },
  prospeccao_contas: {
    headline: 'Prazo da Prestação de Contas 2025',
    body1: 'O prazo para entrega da <strong>prestação de contas 2025</strong> ao TSE/TRE está se aproximando. Seu diretório está preparado?',
    h1icon: '📊', h1title: 'Prestação de Contas 2025 (TSE/TRE)', h1sub: 'Relatórios · Adequação · Recursos administrativos',
    h2icon: '⚖️', h2title: 'Defesa em Processos Eleitorais', h2sub: 'Representações · Recursos · Prestação jurisdicional',
    subject: (c) => `${c.party_acronym || c.party_name || 'Diretório'} - Prestação de Contas 2025 - Suporte Especializado`,
  },
  prospeccao_geral: {
    headline: 'Assessoria Eleitoral para 2026',
    body1: 'Seu diretório está preparado para as <strong>eleições municipais de 2026</strong>? Nossa equipe especializada pode apoiar em todas as frentes jurídicas e eleitorais.',
    h1icon: '🗳️', h1title: 'Registro de Candidatos 2026', h1sub: 'Documentação · Elegibilidade · Recursos',
    h2icon: '📋', h2title: 'Regularização Completa do Diretório', h2sub: 'CNPJ · Contas · Estatuto · Representações',
    subject: (c) => `${c.party_acronym || c.party_name || 'Diretório'} - Assessoria Jurídica Eleitoral 2026`,
  },
};

function buildUnsubscribeFooter(email) {
  return `<tr><td style="background:#f8fafc;border-top:1px solid #e8ecf0;padding:20px 40px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#aaa;">Marcos Eduardo · Contador Partidário e Eleitoral · CRC/SP 151562/O-0</p>
  <p style="margin:4px 0 0;font-size:12px;color:#bbb;">Rua Suíça, 595 - Parque das Nações · Santo André - SP · CEP 09210-000</p>
  <p style="margin:4px 0 0;font-size:12px;color:#bbb;">contato@marcoseduardocontabil.com.br</p>
  <p style="margin:4px 0 0;font-size:11px;color:#ccc;">Você recebeu este e-mail pois seu diretório consta em nossa base de prospecção para 2026.</p>
  <p style="margin:8px 0 0;font-size:11px;color:#ccc;">Não deseja mais receber nossos e-mails? <a href="${unsubscribeUrl(email)}" style="color:#1a3a6b;text-decoration:underline;">Clique aqui para se descadastrar</a>.</p>
  <p style="margin:10px 0 0;font-size:11px;color:#aaa;">Quer acessar nossa plataforma de gestão eleitoral? <a href="https://eleita-tech-2026.base44.app" style="color:#2d5fa6;font-weight:600;text-decoration:underline;">Cadastre-se no sistema LegalTech →</a></p>
</td></tr>`;
}

function injectTracking(html, campaignId, contactId) {
  if (!campaignId || !contactId) return html;

  // Pixel de abertura — injetado antes de </body>
  const pixelUrl = `${TRACK_BASE}?type=open&cid=${encodeURIComponent(campaignId)}&eid=${encodeURIComponent(contactId)}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;

  // Reescrever links externos (não unsubscribe, não imagens)
  const rewritten = html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (match, url) => {
      // Não rastrear links do próprio sistema
      if (url.includes(APP_URL) || url.includes('unsubscribe') || url.includes('base44.app')) return match;
      const trackUrl = `${TRACK_BASE}?type=click&cid=${encodeURIComponent(campaignId)}&eid=${encodeURIComponent(contactId)}&url=${encodeURIComponent(url)}`;
      return `href="${trackUrl}"`;
    }
  );

  // Injeta pixel antes de </body>
  return rewritten.includes('</body>')
    ? rewritten.replace('</body>', `${pixel}</body>`)
    : rewritten + pixel;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Autenticação: aceita chamadas autenticadas (admin/user) OU webhook interno com secret
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    const authHeader = req.headers.get('x-webhook-secret');
    const isWebhook = webhookSecret && authHeader === webhookSecret;

    if (!isWebhook) {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const body = await req.json();
    const contact = body.contact || body.data;
    const templateId = body.template_id || 'prospeccao_geral';

    if (!contact?.email) {
      return Response.json({ error: 'No email provided' }, { status: 400 });
    }

    if (contact.email_valid === false) {
      return Response.json({ skipped: true, reason: 'email_invalid' });
    }

    // Busca configurações (incluindo número WhatsApp e credenciais TurboSMTP)
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const settingsMap = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
    const waNumber = settingsMap['WHATSAPP_CONTACT_NUMBER'] || '5511999990000';

    // If html_body and subject are passed directly (from campaign send), use them
    // Otherwise fall back to built-in templates
    let subject, htmlBody;
    if (body.html_body && body.subject) {
      const personalize = (str) => (str || '')
        .replace(/\{\{nome_responsavel\}\}/g, contact.name || 'Prezado(a)')
        .replace(/\{\{nome_partido\}\}/g, contact.party_name || '')
        .replace(/\{\{sigla_partido\}\}/g, contact.party_acronym || '')
        .replace(/\{\{cidade\}\}/g, contact.city || '')
        .replace(/\{\{estado\}\}/g, contact.state || '')
        .replace(/\{\{email\}\}/g, contact.email || '')
        .replace(/\{\{cnpj\}\}/g, contact.cnpj || '')
        .replace(/\{\{assunto_campanha\}\}/g, body.subject || '');

      const personalizeHtmlUrls = (html) => {
        return html.replace(/href="(https:\/\/wa\.me\/[^"]+)"/g, (match, url) => {
          try {
            const [base, qs] = url.split('?text=');
            if (!qs) return match;
            const decoded = decodeURIComponent(qs);
            const personalized = personalize(decoded);
            return `href="${base}?text=${encodeURIComponent(personalized)}"`;
          } catch {
            return match;
          }
        });
      };

      subject = personalize(body.subject);
      const rawHtml = personalizeHtmlUrls(personalize(body.html_body));
      const isFullHtml = rawHtml.trim().toLowerCase().startsWith('<!doctype') || rawHtml.trim().toLowerCase().startsWith('<html');
      htmlBody = isFullHtml ? rawHtml : `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">
<tr><td style="background:linear-gradient(135deg,#1a3a6b,#2d5fa6);padding:32px 40px;text-align:center;">
  <p style="margin:0 0 4px;color:#c8d8f0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Escritório Contábil</p>
  <h1 style="margin:0;color:#f0c040;font-size:22px;font-weight:700;">Marcos Eduardo</h1>
  <p style="margin:6px 0 0;color:#c8d8f0;font-size:13px;">Assessoria em Contabilidade Eleitoral · CRC/SP 151562/O-0</p>
  <p style="margin:4px 0 0;color:#a0b4cc;font-size:12px;">contato@marcoseduardocontabil.com.br</p>
</td></tr>
<tr><td style="padding:40px;">${rawHtml}</td></tr>
${buildUnsubscribeFooter(contact.email)}
</table>
</td></tr>
</table>
</body>
</html>`;
    } else {
      const tpl = TEMPLATES[templateId] || TEMPLATES['prospeccao_geral'];
      subject = tpl.subject(contact);
      htmlBody = buildHtml(contact, tpl, waNumber);
    }

    // Injetar tracking de abertura e clique
    const campaignId = body.campaign_id || null;
    htmlBody = injectTracking(htmlBody, campaignId, contact.id || null);

    // Send via TurboSMTP API (única via de envio)
    const consumerKey = settingsMap['TURBOSMTP_CONSUMER_KEY'];
    const consumerSecret = settingsMap['TURBOSMTP_CONSUMER_SECRET'];
    const fromEmail = settingsMap['TURBOSMTP_FROM_EMAIL'] || 'contato@marcoseduardocontabil.com.br';
    const fromName = settingsMap['TURBOSMTP_FROM_NAME'] || 'Marcos Eduardo - Contador Partidário e Eleitoral';

    if (!consumerKey || !consumerSecret) {
      throw new Error('TurboSMTP não configurado. Adicione TURBOSMTP_CONSUMER_KEY e TURBOSMTP_CONSUMER_SECRET nas Configurações → API Keys.');
    }

    const turboRes = await fetch('https://api.turbo-smtp.com/api/v2/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'consumerKey': consumerKey,
        'consumerSecret': consumerSecret,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: contact.email,
        subject: subject,
        html_content: htmlBody,
        content: htmlBody.replace(/<[^>]+>/g, ''),
      }),
    });

    if (!turboRes.ok) {
      const errData = await turboRes.text();
      console.error('TurboSMTP error:', turboRes.status, errData);
      throw new Error(`TurboSMTP error ${turboRes.status}: ${errData}`);
    }

    if (contact.id) {
      await base44.asServiceRole.entities.Contact.update(contact.id, {
        last_email_sent: new Date().toISOString(),
        emails_sent_count: (contact.emails_sent_count || 0) + 1,
        status: contact.status === 'novo' ? 'contato_feito' : contact.status,
      });
    }

    return Response.json({ success: true, to: contact.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});