/**
 * sendEmailTurboSMTP — Função utilitária central de envio via TurboSMTP API v2
 * 
 * Autenticação: consumerKey + consumerSecret (headers HTTP)
 * Endpoint: POST https://pro.api.serversmtp.com/api/v2/mail/send
 * 
 * Payload esperado:
 *   { to, subject, html_body, from_email?, from_name? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TURBOSMTP_SEND_URL = 'https://api.turbo-smtp.com/api/v2/mail/send';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, html_body, from_email, from_name } = await req.json();

    if (!to || !subject || !html_body) {
      return Response.json({ error: 'Campos obrigatórios: to, subject, html_body' }, { status: 400 });
    }

    // Busca credenciais do AppSettings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const cfg = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});

    const consumerKey = cfg['TURBOSMTP_CONSUMER_KEY'];
    const consumerSecret = cfg['TURBOSMTP_CONSUMER_SECRET'];
    const finalFromEmail = from_email || cfg['TURBOSMTP_FROM_EMAIL'] || 'contato@marcoseduardocontabil.com.br';
    const finalFromName = from_name || cfg['TURBOSMTP_FROM_NAME'] || 'Marcos Eduardo - Contador Partidário e Eleitoral';

    if (!consumerKey || !consumerSecret) {
      return Response.json({
        error: 'TurboSMTP não configurado. Acesse Configurações → API Keys e preencha TURBOSMTP_CONSUMER_KEY e TURBOSMTP_CONSUMER_SECRET.'
      }, { status: 500 });
    }

    const res = await fetch(TURBOSMTP_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'consumerKey': consumerKey,
        'consumerSecret': consumerSecret,
      },
      body: JSON.stringify({
        from: `${finalFromName} <${finalFromEmail}>`,
        to: Array.isArray(to) ? to.join(',') : to,
        subject: subject,
        html_content: html_body,
        content: html_body.replace(/<[^>]+>/g, ''),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('TurboSMTP error:', res.status, JSON.stringify(data));
      return Response.json({ error: 'Erro ao enviar via TurboSMTP', details: data, status: res.status }, { status: res.status });
    }

    return Response.json({ success: true, to, data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});