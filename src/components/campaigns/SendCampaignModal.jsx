import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Users, Tag, CheckCircle2, Filter, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const STATUS_LABELS = {
  all: 'Todos os contatos',
  novo: 'Novos',
  contato_feito: 'Contato Feito',
  interessado: 'Interessados',
  proposta_enviada: 'Proposta Enviada',
};

const TAG_OPTIONS = ['Urgente', 'Pendência 2024', 'CNPJ', 'Contas 2025'];

export default function SendCampaignModal({ campaign, onClose }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState(null);
  const [step, setStep] = useState('config'); // config | confirm | sending | done
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-send'],
    queryFn: () => base44.entities.Contact.list('-created_date', 1000),
  });

  const updateCampaignMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.update(campaign.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const recipients = contacts.filter(c => {
    if (!c.email_valid && c.email_valid !== undefined) return false;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchTag = !tagFilter || (c.tags || []).includes(tagFilter);
    return matchStatus && matchTag;
  });

  const handleSend = async () => {
    setStep('sending');
    // Simulate sending + update campaign stats
    await new Promise(r => setTimeout(r, 1800));
    await updateCampaignMutation.mutateAsync({
      status: 'enviado',
      total_sent: recipients.length,
      total_opened: 0,
      total_clicked: 0,
      sent_at: new Date().toISOString(),
    });
    setStep('done');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-playfair">Enviar Campanha</DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-4 py-2">
            {/* Campaign info */}
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Campanha selecionada</p>
              <p className="text-sm font-semibold text-foreground">{campaign.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{campaign.subject_a}</p>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Segmentação dos Destinatários</p>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Filtrar por status</p>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Filtrar por tag</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setTagFilter(null)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!tagFilter ? 'bg-navy text-white border-navy' : 'border-border text-muted-foreground hover:border-navy hover:text-navy'}`}
                  >
                    Todas
                  </button>
                  {TAG_OPTIONS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${tagFilter === tag ? 'bg-navy text-white border-navy' : 'border-border text-muted-foreground hover:border-navy hover:text-navy'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recipient count */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${recipients.length > 0 ? 'bg-success/5 border-success/30' : 'bg-warning/5 border-warning/30'}`}>
              <Users size={18} className={recipients.length > 0 ? 'text-success' : 'text-warning'} />
              <div>
                <p className="text-sm font-bold text-foreground">{recipients.length.toLocaleString('pt-BR')} destinatários</p>
                <p className="text-xs text-muted-foreground">serão incluídos neste envio</p>
              </div>
            </div>

            {recipients.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-warning bg-warning/5 border border-warning/20 rounded-lg p-2">
                <AlertTriangle size={13} /> Nenhum contato encontrado com esses filtros
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={recipients.length === 0}
                className="flex-1 bg-navy text-white"
              >
                Revisar Envio
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 py-2">
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 text-sm space-y-2">
              <p className="font-semibold text-foreground">Confirme o envio:</p>
              <div className="space-y-1 text-muted-foreground text-xs">
                <div className="flex justify-between"><span>Campanha:</span><span className="font-medium text-foreground">{campaign.name}</span></div>
                <div className="flex justify-between"><span>Assunto:</span><span className="font-medium text-foreground truncate max-w-[180px]">{campaign.subject_a}</span></div>
                <div className="flex justify-between"><span>Segmento:</span><span className="font-medium text-foreground">{STATUS_LABELS[statusFilter]}</span></div>
                <div className="flex justify-between"><span>Destinatários:</span><span className="font-bold text-navy">{recipients.length.toLocaleString('pt-BR')}</span></div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('config')} className="flex-1">Voltar</Button>
              <Button onClick={handleSend} className="flex-1 bg-navy text-white">
                <Send size={13} className="mr-1.5" /> Confirmar Envio
              </Button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-navy/10 rounded-full flex items-center justify-center">
              <span className="w-7 h-7 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Enviando campanha...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Processando {recipients.length.toLocaleString('pt-BR')} e-mails
              </p>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 size={28} className="text-success" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Campanha enviada!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {recipients.length.toLocaleString('pt-BR')} e-mails enviados com sucesso.
              </p>
            </div>
            <Button onClick={onClose} className="bg-navy text-white px-8">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}