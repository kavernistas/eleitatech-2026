import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays, Check, ExternalLink, Info } from 'lucide-react';

const SETTING_KEY = 'scheduling_link';
const SETTING_KEY_MSG = 'scheduling_message';

const DEFAULT_MSG = '📅 *Reunião de Diagnóstico Gratuita*\n\nPercebo que você tem interesse nos nossos serviços! Que tal agendarmos uma conversa de 30 minutos com o Dr. Marcos Eduardo para analisarmos a situação do seu diretório?\n\n👇 Escolha o melhor horário:';

export default function SchedulingLinkSettings() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [msgValue, setMsgValue] = useState(DEFAULT_MSG);

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  useEffect(() => {
    const linkRecord = settings.find(s => s.key === SETTING_KEY);
    const msgRecord = settings.find(s => s.key === SETTING_KEY_MSG);
    if (linkRecord) setLinkValue(linkRecord.value || '');
    if (msgRecord) setMsgValue(msgRecord.value || DEFAULT_MSG);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const upsert = async (key, value) => {
        const existing = settings.find(s => s.key === key);
        if (existing) {
          await base44.entities.AppSettings.update(existing.id, { value });
        } else {
          await base44.entities.AppSettings.create({ key, value });
        }
      };
      await Promise.all([
        upsert(SETTING_KEY, linkValue),
        upsert(SETTING_KEY_MSG, msgValue),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <CalendarDays size={15} className="text-blue-500" />
        Link de Agendamento (Alta Intenção)
      </h3>
      <p className="text-xs text-muted-foreground">
        Quando a IA detectar alto interesse de um lead (score ≥ 7/10), enviará automaticamente este link no WhatsApp para agendar uma reunião de diagnóstico.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-xs text-blue-700">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          Use links do <strong>Google Agenda</strong> (Configurações → Compromissos → Criar página de agendamento) ou <strong>Calendly</strong>.
          O link será enviado automaticamente via WhatsApp quando a IA detectar intenção de fechar negócio.
        </span>
      </div>

      <div>
        <Label className="text-xs">Link de Agendamento</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={linkValue}
            onChange={e => setLinkValue(e.target.value)}
            placeholder="https://calendar.google.com/calendar/appointments/... ou https://calendly.com/..."
            className="h-9 text-sm flex-1"
          />
          {linkValue && (
            <Button variant="outline" size="sm" className="h-9 px-3" asChild>
              <a href={linkValue} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={13} />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label className="text-xs">Mensagem enviada junto ao link</Label>
        <textarea
          value={msgValue}
          onChange={e => setMsgValue(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-mono text-xs"
        />
        <p className="text-[10px] text-muted-foreground mt-1">Use *texto* para negrito no WhatsApp.</p>
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        size="sm"
        className="bg-navy text-white hover:bg-navy/90"
      >
        {saved ? <><Check size={13} className="mr-1.5" />Salvo!</> : 'Salvar Configurações de Agendamento'}
      </Button>
    </div>
  );
}