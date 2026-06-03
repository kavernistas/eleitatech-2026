import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, CheckCircle2, Clock, AlertCircle, Send, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const BATCH_SIZE = 20;
const MSG_INTERVAL_S = 15;
const BATCH_PAUSE_MIN = 20;

function calcNextBatch(totalSent) {
  if (!totalSent || totalSent === 0) return null;
  const batchIndex = Math.floor(totalSent / BATCH_SIZE);
  const posInBatch = totalSent % BATCH_SIZE;
  // Se acabou de completar um lote (posInBatch === 0), está na pausa de 20min
  if (posInBatch === 0) return { pausing: true, batchIndex };
  // Caso contrário, próxima pausa é daqui a (BATCH_SIZE - posInBatch) mensagens
  const msgsUntilPause = BATCH_SIZE - posInBatch;
  return { pausing: false, msgsUntilPause };
}

const STATUS_MAP = {
  rascunho: { label: 'Rascunho', color: 'text-muted-foreground', bg: 'bg-muted' },
  agendado: { label: 'Agendado', color: 'text-blue-600', bg: 'bg-blue-50' },
  enviando: { label: 'Enviando', color: 'text-green-600', bg: 'bg-green-50' },
  enviado: { label: 'Concluída', color: 'text-green-700', bg: 'bg-green-50' },
  pausado: { label: 'Pausada', color: 'text-warning', bg: 'bg-warning/10' },
};

export default function WhatsappCampaignStatus() {
  const [now, setNow] = useState(Date.now());

  // Atualiza o relógio a cada 30s para exibir tempo restante dinâmico
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['wpp-campaigns-status'],
    queryFn: () => base44.entities.WhatsappCampaign.list('-updated_date', 10),
    refetchInterval: 30_000,
  });

  const active = campaigns.filter(c => c.status === 'enviando');
  const recent = campaigns.filter(c => c.status !== 'rascunho').slice(0, 4);

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-green-600" />
          <h3 className="font-semibold text-foreground text-sm">Campanhas WhatsApp</h3>
        </div>
        <Link to="/whatsapp-campaigns" className="text-xs text-navy hover:underline">Ver todas</Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          <MessageSquare size={22} className="mx-auto mb-2 opacity-20" />
          Nenhuma campanha criada
        </div>
      ) : (
        <>
          {/* Campanhas ativas (enviando) */}
          {active.length > 0 && active.map(c => {
            const next = calcNextBatch(c.total_sent);
            const sentAt = c.sent_at ? new Date(c.sent_at) : c.updated_date ? new Date(c.updated_date) : null;
            // Tempo restante na pausa (estimativa baseada em updated_date)
            let pauseRemaining = null;
            if (next?.pausing && sentAt) {
              const elapsedMin = (now - sentAt.getTime()) / 60_000;
              const remaining = Math.max(0, Math.ceil(BATCH_PAUSE_MIN - elapsedMin));
              pauseRemaining = remaining;
            }

            return (
              <div key={c.id} className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-green-800 truncate max-w-[60%]">{c.name}</span>
                  <span className="flex items-center gap-1 text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    <Loader2 size={10} className="animate-spin" /> Enviando
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-md p-2 text-center">
                    <p className="text-lg font-bold text-green-700">{(c.total_sent || 0).toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-muted-foreground">Enviadas</p>
                  </div>
                  <div className="bg-white rounded-md p-2 text-center">
                    <p className="text-lg font-bold text-destructive">{(c.total_errors || 0).toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-muted-foreground">Erros</p>
                  </div>
                </div>
                {next && (
                  <div className="flex items-center gap-1.5 text-[11px] text-green-700">
                    <Clock size={11} />
                    {next.pausing
                      ? pauseRemaining !== null
                        ? `Pausa entre lotes · ~${pauseRemaining} min restantes`
                        : `Pausa de ${BATCH_PAUSE_MIN} min entre lotes`
                      : `Próxima pausa em ${next.msgsUntilPause} msg · intervalos de ${MSG_INTERVAL_S}s`
                    }
                  </div>
                )}
              </div>
            );
          })}

          {/* Campanhas recentes */}
          {recent.length > 0 && (
            <div className="space-y-1.5">
              {recent.map(c => {
                const s = STATUS_MAP[c.status] || STATUS_MAP.rascunho;
                return (
                  <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Send size={12} className="text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {c.total_sent > 0 && (
                        <span className="text-[11px] text-muted-foreground">{c.total_sent.toLocaleString('pt-BR')} env.</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.bg} ${s.color}`}>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}