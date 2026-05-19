import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6.9.9';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { to, subject, html, text, from_name, reply_to } = await req.json();

    if (!to || !subject || (!html && !text)) {
      return Response.json({ error: 'Campos obrigatórios: to, subject, html ou text' }, { status: 400 });
    }

    // Busca credenciais SMTP do AppSettings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const cfg = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});

    const smtpUser = cfg['SMTP_USER'] || cfg['TURBOSMTP_FROM_EMAIL'] || 'contato@marcoseduardocontabil.com.br';
    const smtpPass = Deno.env.get('SMTP_PASSWORD');
    const smtpHost = cfg['SMTP_HOST'] || 'smtp.hostinger.com';
    const smtpPort = parseInt(cfg['SMTP_PORT'] || '587', 10);
    const defaultFromName = cfg['TURBOSMTP_FROM_NAME'] || 'Marcos Eduardo - Contador Partidário e Eleitoral';

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      requireTLS: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const info = await transporter.sendMail({
      from: `"${from_name || defaultFromName}" <${smtpUser}>`,
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
      replyTo: reply_to || smtpUser,
    });

    return Response.json({ ok: true, message_id: info.messageId });
  } catch (error) {
    console.error('SMTP error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});