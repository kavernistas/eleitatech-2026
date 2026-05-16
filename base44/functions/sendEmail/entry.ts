import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6.9.9';

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false, // STARTTLS
  requireTLS: true,
  auth: {
    user: 'contato@marcoseduardocontabil.com.br',
    pass: Deno.env.get('SMTP_PASSWORD'),
  },
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, html, text, from_name, reply_to } = await req.json();

    if (!to || !subject || (!html && !text)) {
      return Response.json({ error: 'Campos obrigatórios: to, subject, html ou text' }, { status: 400 });
    }

    const info = await transporter.sendMail({
      from: `"${from_name || 'Marcos Eduardo - Contador Partidário e Eleitoral'}" <contato@marcoseduardocontabil.com.br>`,
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
      replyTo: reply_to || 'contato@marcoseduardocontabil.com.br',
    });

    return Response.json({ ok: true, message_id: info.messageId });
  } catch (error) {
    console.error('SMTP error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});