import { Mail, MousePointer, UserPlus, MessageSquare, AlertCircle } from 'lucide-react';

const mockActivity = [
  { type: 'email_opened', party: 'PT - São Paulo', time: '2 min atrás', icon: Mail, color: 'text-primary' },
  { type: 'link_clicked', party: 'MDB - Rio de Janeiro', time: '8 min atrás', icon: MousePointer, color: 'text-gold' },
  { type: 'new_lead', party: 'PSB - Minas Gerais', time: '15 min atrás', icon: UserPlus, color: 'text-success' },
  { type: 'whatsapp', party: 'PSOL - Bahia', time: '22 min atrás', icon: MessageSquare, color: 'text-primary' },
  { type: 'human_alert', party: 'PP - Paraná', time: '1h atrás', icon: AlertCircle, color: 'text-warning' },
  { type: 'email_opened', party: 'Solidariedade - RS', time: '1h atrás', icon: Mail, color: 'text-primary' },
];

const labels = {
  email_opened: 'Abriu o e-mail',
  link_clicked: 'Clicou no diagnóstico',
  new_lead: 'Novo lead capturado',
  whatsapp: 'Iniciou conversa IA',
  human_alert: 'Requer atendimento humano',
};

export default function ActivityFeed() {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-foreground mb-4 text-sm">Atividade Recente</h3>
      <div className="space-y-3">
        {mockActivity.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-3 group">
              <div className={`w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ${item.color}`}>
                <Icon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{labels[item.type]}</p>
                <p className="text-[11px] text-muted-foreground truncate">{item.party}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}