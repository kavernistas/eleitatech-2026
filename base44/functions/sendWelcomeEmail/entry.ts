import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function buildHtml(contact) {
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
  <h1 style="margin:0;color:#f0c040;font-size:22px;font-weight:700;">Marcos Eduardo</h1>
  <p style="margin:6px 0 0;color:#c8d8f0;font-size:13px;">Contador Partidário e Eleitoral · CRC/SP 151562/O-0</p>
</td></tr>
<tr><td style="padding:40px;">
  <p style="margin:0 0 16px;font-size:16px;color:#1a3a6b;font-weight:600;">Olá, ${name}${greeting ? ' — ' + greeting : ''}!</p>
  <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
    Identificamos que o seu diretório partidário pode ter <strong>pendências de regularização</strong> junto à Justiça Eleitoral para 2026.
  </p>
  <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">Nosso escritório é especializado em:</p>
  <div style="background:#f0f5ff;border-left:4px solid #2d5fa6;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:12px;">
    <strong style="color:#1a3a6b;font-size:14px;">📋 Regularização de CNPJ Partidário</strong><br>
    <span style="color:#666;font-size:13px;">Pendências 2024 · Baixa de débitos · Adequação cadastral</span>
  </div>
  <div style="background:#f0f5ff;border-left:4px solid #f0c040;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:24px;">
    <strong style="color:#1a3a6b;font-size:14px;">📊 Prestação de Contas 2025 (TSE/TRE)</strong><br>
    <span style="color:#666;font-size:13px;">Relatórios · Adequação · Recursos administrativos</span>
  </div>
  <table width="100%"><tr><td align="center" style="padding:8px 0 24px;">
    <a href="https://wa.me/5511999990000?text=Ol%C3%A1%2C+vim+pelo+e-mail+sobre+regulariza%C3%A7%C3%A3o+partid%C3%A1ria"
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
  <p style="margin:4px 0 0;font-size:11px;color:#ccc;">Você recebeu este e-mail pois seu diretório consta em nossa base de prospecção para 2026.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const contact = body.contact || body.data;

    if (!contact?.email) {
      return Response.json({ error: 'No email provided' }, { status: 400 });
    }

    if (contact.email_valid !== undefined && contact.email_valid !== true) {
      return Response.json({ skipped: true, reason: 'email_invalid' });
    }

    const subject = contact.party_name
      ? `${contact.party_acronym || contact.party_name} - Regularização Partidária 2026 - Diagnóstico Gratuito`
      : `Regularização Partidária 2026 - Diagnóstico Gratuito para seu Diretório`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: contact.email,
      subject,
      body: buildHtml(contact),
      from_name: 'Marcos Eduardo - Contador Partidário',
    });

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