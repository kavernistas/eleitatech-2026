import { useState, useEffect } from 'react';
import { Bot, PauseCircle, PlayCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function AiAgentToggle({ settings, saveMutation }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const map = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
    setPaused(map.ai_agent_paused === 'true');
  }, [settings]);

  const handleToggle = (checked) => {
    // checked = true significa ATIVO (não pausado), false = pausado
    const newPaused = !checked;
    setPaused(newPaused);
    saveMutation.mutate({ ai_agent_paused: newPaused ? 'true' : 'false' });
  };

  const isActive = !paused;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
        <Bot size={15} /> Agente IA — WhatsApp
      </h3>

      <div className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${isActive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3">
          {isActive
            ? <PlayCircle size={20} className="text-green-600" />
            : <PauseCircle size={20} className="text-red-500" />
          }
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isActive ? 'Agente IA Ativo' : 'Agente IA Pausado'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isActive
                ? 'Respondendo automaticamente às mensagens recebidas no WhatsApp'
                : 'Mensagens são salvas, mas sem resposta automática da IA'
              }
            </p>
          </div>
        </div>
        <Switch checked={isActive} onCheckedChange={handleToggle} />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Ao pausar, as mensagens continuam sendo registradas no CRM, mas o agente não responde automaticamente. Contatos em <strong>Atendimento Humano</strong> já não recebem resposta da IA independente desse toggle.
      </p>
    </div>
  );
}