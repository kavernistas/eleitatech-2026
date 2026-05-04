import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';

// Play a short beep notification
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

export default function UrgentActions() {
  const navigate = useNavigate();
  const prevCountRef = useRef(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-urgent'],
    queryFn: () => base44.entities.Contact.filter({ status: 'atendimento_humano' }, '-updated_date', 10),
    refetchInterval: 15000,
  });

  // Sound + browser notification when a NEW urgent contact appears
  useEffect(() => {
    if (prevCountRef.current === null) { prevCountRef.current = contacts.length; return; }
    if (contacts.length > prevCountRef.current) {
      playNotificationSound();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⚠️ Novo Atendimento Urgente', {
          body: `${contacts[0]?.name || contacts[0]?.email || 'Contato'} requer atendimento humano agora.`,
          icon: '/favicon.ico',
        });
      }
    }
    prevCountRef.current = contacts.length;
  }, [contacts.length]);

  if (contacts.length === 0) return null;

  return (
    <div className="bg-warning/5 border border-warning/30 rounded-xl p-4 animate-pulse-gold">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-warning animate-pulse" />
        <p className="text-xs font-semibold text-warning uppercase tracking-wider">
          {contacts.length} Aguardando Atendimento Humano
        </p>
      </div>
      <div className="space-y-2">
        {contacts.slice(0, 4).map(c => (
          <div
            key={c.id}
            onClick={() => navigate('/ai-agent')}
            className="flex items-center justify-between bg-card border border-warning/20 rounded-lg px-3 py-2 cursor-pointer hover:border-warning/60 hover:bg-warning/5 transition-all group animate-pulse"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 bg-warning/20 text-warning rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 animate-pulse">
                {(c.name || c.email || '?').substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{c.name || c.email}</p>
                <p className="text-[10px] text-muted-foreground truncate">{c.party_acronym || c.party_name || '—'}</p>
              </div>
            </div>
            <ChevronRight size={13} className="text-muted-foreground group-hover:text-warning flex-shrink-0" />
          </div>
        ))}
      </div>
      {contacts.length > 4 && (
        <button onClick={() => navigate('/contacts')} className="text-[11px] text-warning hover:underline mt-2 block text-center w-full">
          + {contacts.length - 4} contatos urgentes
        </button>
      )}
    </div>
  );
}