import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UrgentActions() {
  const navigate = useNavigate();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-urgent'],
    queryFn: () => base44.entities.Contact.filter({ status: 'atendimento_humano' }, '-updated_date', 10),
  });

  if (contacts.length === 0) return null;

  return (
    <div className="bg-warning/5 border border-warning/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-warning" />
        <p className="text-xs font-semibold text-warning uppercase tracking-wider">
          {contacts.length} Aguardando Atendimento Humano
        </p>
      </div>
      <div className="space-y-2">
        {contacts.slice(0, 4).map(c => (
          <div
            key={c.id}
            onClick={() => navigate('/ai-agent')}
            className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2 cursor-pointer hover:border-warning/50 transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 bg-warning/20 text-warning rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0">
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