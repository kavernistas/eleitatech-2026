import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.8.25';

// 1x1 transparent GIF
const PIXEL = new Uint8Array([
  71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,0,0,0,0,0,44,
  0,0,0,0,1,0,1,0,0,2,2,68,1,0,59
]);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get('type'); // 'open' or 'click'
  const cid = url.searchParams.get('cid');   // campaign id
  const eid = url.searchParams.get('eid');   // contact id
  const dest = url.searchParams.get('url');  // destination url (for clicks)

  // Fire-and-forget tracking (don't block the response)
  if (cid && eid && (type === 'open' || type === 'click')) {
    (async () => {
      try {
        const appId = Deno.env.get('BASE44_APP_ID');
        const base44 = createClient({ appId });

        if (type === 'open') {
          // Update contact
          const contact = await base44.asServiceRole.entities.Contact.list()
            .then(all => all.find(c => c.id === eid));
          if (contact) {
            await base44.asServiceRole.entities.Contact.update(eid, {
              last_email_opened: new Date().toISOString(),
              emails_opened_count: (contact.emails_opened_count || 0) + 1,
            });
          }
          // Update campaign total_opened
          const campaign = await base44.asServiceRole.entities.Campaign.list()
            .then(all => all.find(c => c.id === cid));
          if (campaign) {
            await base44.asServiceRole.entities.Campaign.update(cid, {
              total_opened: (campaign.total_opened || 0) + 1,
            });
          }
        } else if (type === 'click') {
          // Update contact
          const contact = await base44.asServiceRole.entities.Contact.list()
            .then(all => all.find(c => c.id === eid));
          if (contact) {
            await base44.asServiceRole.entities.Contact.update(eid, {
              last_clicked: new Date().toISOString(),
              clicks_count: (contact.clicks_count || 0) + 1,
              status: ['novo','contato_feito'].includes(contact.status) ? 'interessado' : contact.status,
            });
          }
          // Update campaign total_clicked + click_map
          const campaign = await base44.asServiceRole.entities.Campaign.list()
            .then(all => all.find(c => c.id === cid));
          if (campaign) {
            const clickMap = campaign.click_map || {};
            const key = dest ? new URL(dest).hostname : 'unknown';
            clickMap[key] = (clickMap[key] || 0) + 1;
            await base44.asServiceRole.entities.Campaign.update(cid, {
              total_clicked: (campaign.total_clicked || 0) + 1,
              click_map: clickMap,
            });
          }
        }
      } catch (e) {
        console.error('tracking error:', e.message);
      }
    })();
  }

  // Respond immediately
  if (type === 'open') {
    return new Response(PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  }

  // Click: redirect
  const redirectTo = dest || 'https://eleita-tech-2026.base44.app';
  return Response.redirect(redirectTo, 302);
});