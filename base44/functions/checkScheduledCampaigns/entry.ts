import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Aceita chamadas de admin autenticado OU scheduler interno com WEBHOOK_SECRET
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    const headerSecret = req.headers.get('x-webhook-secret');
    const isScheduler = webhookSecret && headerSecret === webhookSecret;

    if (!isScheduler) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all scheduled campaigns using service role (called by scheduler)
    const campaigns = await base44.asServiceRole.entities.Campaign.filter({ status: 'agendado' }, '-scheduled_at', 50);

    const now = new Date();
    const triggered = [];

    for (const campaign of campaigns) {
      if (!campaign.scheduled_at) continue;

      const scheduledTime = new Date(campaign.scheduled_at);

      // If the scheduled time has passed, mark as sending → enviado
      if (scheduledTime <= now) {
        await base44.asServiceRole.entities.Campaign.update(campaign.id, {
          status: 'enviado',
          sent_at: now.toISOString(),
          total_sent: campaign.total_sent || 0,
        });
        triggered.push({ id: campaign.id, name: campaign.name, scheduled_at: campaign.scheduled_at });
      }
    }

    return Response.json({
      checked: campaigns.length,
      triggered: triggered.length,
      campaigns_triggered: triggered,
      checked_at: now.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});