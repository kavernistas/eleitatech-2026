import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, MousePointer, UserPlus, MessageSquare, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeConfig = {
  whatsapp: { label: 'Conversa WhatsApp', icon: MessageSquare, color: 'text-primary' },
  atendimento_humano: { label: 'Requer atendimento humano', icon: AlertCircle, color: 'text-warning' },
  novo: { label: 'Novo lead', icon: UserPlus, color: 'text-success' },
  interessado: { label: 'Demonstrou interesse', icon: Mail, color: 'text-primary' },
  proposta_enviada: { label: 'Proposta enviada', icon: Mail, color: 'text-gold' },
  contato_feito: { label: 'Contato realizado', icon: MousePointer, color: 'text-primary' },
};

export default function ActivityFeed() {
  const { data: contacts = [] } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => base44.entities.Contact.list('-updated_date', 8),
    refetchInterval: 30000,
  });

  if (contacts.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-foreground mb-4 text-sm">Atividade Recente</h3>
      <div className="space-y-3">
        {contacts.map((c) => {
          const config = typeConfig[c.status] || typeConfig.contato_feito;
          const Icon = config.icon;
          const timeAgo = formatDistanceToNow(new Date(c.updated_date), { addSuffix: true, locale: ptBR });
          return (
            <div key={c.id} className="flex items-center gap-3 group">
              <div className={`w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ${config.color}`}>
                <Icon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{config.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.name || c.phone || c.email || '—'}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}