import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Send, Edit2, Trash2, MessageSquare, CheckCircle2, Clock, Pause, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import WhatsappCampaignForm from '@/components/whatsapp/WhatsappCampaignForm';
import SendWhatsappModal from '@/components/whatsapp/SendWhatsappModal';

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-100 text-slate-600 border-slate-300', icon: FileText },
  agendado: { label: 'Agendado', color: 'bg-blue-50 text-blue-700 border-blue-300', icon: Clock },
  enviando: { label: 'Enviando', color: 'bg-yellow-50 text-yellow-700 border-yellow-300', icon: Send },
  enviado: { label: 'Enviado', color: 'bg-green-50 text-green-700 border-green-300', icon: CheckCircle2 },
  pausado: { label: 'Pausado', color: 'bg-orange-50 text-orange-700 border-orange-300', icon: Pause },
};

export default function WhatsappCampaigns() {
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [sendingCampaign, setSendingCampaign] = useState(null);
  const qc = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['whatsapp-campaigns'],
    queryFn: () => base44.entities.WhatsappCampaign.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WhatsappCampaign.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-campaigns'] }),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-playfair font-bold text-navy">Campanhas WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Crie e envie mensagens segmentadas via Evolution API</p>
        </div>
        <Button onClick={() => { setEditingCampaign(null); setShowForm(true); }} className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <Plus size={15} /> Nova Campanha
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: campaigns.length, icon: MessageSquare, color: 'text-navy' },
          { label: 'Enviadas', value: campaigns.filter(c => c.status === 'enviado').length, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Rascunhos', value: campaigns.filter(c => c.status === 'rascunho').length, icon: FileText, color: 'text-slate-500' },
          { label: 'Msgs Enviadas', value: campaigns.reduce((a, c) => a + (c.total_sent || 0), 0).toLocaleString('pt-BR'), icon: Send, color: 'text-gold' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon size={14} className={stat.color} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nenhuma campanha criada</p>
          <p className="text-sm">Crie sua primeira campanha de WhatsApp</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const sc = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.rascunho;
            const Icon = sc.icon;
            return (
              <div key={campaign.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 card-hover">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                  <MessageSquare size={18} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm truncate">{campaign.name}</p>
                    <Badge className={`text-[11px] px-2 py-0.5 border shrink-0 ${sc.color}`}>
                      <Icon size={10} className="mr-1 inline" />{sc.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{campaign.message_template}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {campaign.total_sent > 0 && (
                      <span className="text-[11px] text-green-600 font-medium">✓ {campaign.total_sent} enviadas</span>
                    )}
                    {campaign.total_errors > 0 && (
                      <span className="text-[11px] text-destructive">{campaign.total_errors} erros</span>
                    )}
                    {campaign.sent_at && (
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(campaign.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      Criada {format(new Date(campaign.created_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => setSendingCampaign(campaign)}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 gap-1.5"
                    disabled={campaign.status === 'enviando'}
                  >
                    <Send size={13} /> Enviar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingCampaign(campaign); setShowForm(true); }}
                    className="h-8 w-8 p-0">
                    <Edit2 size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (confirm(`Excluir campanha "${campaign.name}"?`)) deleteMutation.mutate(campaign.id);
                  }} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <WhatsappCampaignForm
          campaign={editingCampaign}
          onClose={() => { setShowForm(false); setEditingCampaign(null); }}
        />
      )}

      {sendingCampaign && (
        <SendWhatsappModal
          campaign={sendingCampaign}
          onClose={() => setSendingCampaign(null)}
        />
      )}
    </div>
  );
}