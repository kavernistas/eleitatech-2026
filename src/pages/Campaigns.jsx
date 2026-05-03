import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Send, Clock, BarChart2, Copy, Trash2, TestTube, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CampaignEditor from '@/components/campaigns/CampaignEditor';
import ABTestPanel from '@/components/campaigns/ABTestPanel';

const statusColors = {
  rascunho: 'bg-muted text-muted-foreground',
  agendado: 'bg-blue-100 text-blue-700',
  enviando: 'bg-yellow-100 text-yellow-700',
  enviado: 'bg-green-100 text-green-700',
  pausado: 'bg-gray-100 text-gray-500',
};

const typeLabels = {
  email_marketing: 'E-mail Marketing',
  boas_vindas: 'Boas-vindas',
  remarketing: 'Remarketing',
  sms: 'SMS',
  push: 'Push',
};

export default function Campaigns() {
  const [view, setView] = useState('list'); // list | editor | ab
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date', 50),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const handleNew = () => { setSelected(null); setView('editor'); };
  const handleEdit = (c) => { setSelected(c); setView('editor'); };
  const handleAB = (c) => { setSelected(c); setView('ab'); };
  const handleBack = () => { setView('list'); setSelected(null); qc.invalidateQueries({ queryKey: ['campaigns'] }); };

  if (view === 'editor') return <CampaignEditor campaign={selected} onBack={handleBack} />;
  if (view === 'ab') return <ABTestPanel campaign={selected} onBack={handleBack} />;

  return (
    <div className="p-5 lg:p-7 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-foreground">Campanhas</h1>
          <p className="text-muted-foreground text-sm">{campaigns.length} campanhas criadas</p>
        </div>
        <Button onClick={handleNew} className="bg-navy text-white hover:bg-navy/90">
          <Plus size={14} className="mr-1.5" /> Nova Campanha
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Send size={40} className="text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground font-medium">Nenhuma campanha ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Crie sua primeira campanha para começar</p>
          <Button onClick={handleNew} className="mt-4 bg-navy text-white">
            <Plus size={13} className="mr-1.5" /> Criar Campanha
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="bg-card border border-border rounded-xl p-5 card-hover">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[campaign.status]}`}>
                      {campaign.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {typeLabels[campaign.type] || campaign.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{campaign.subject_a || 'Sem assunto'}</p>

                  <div className="flex items-center gap-5 mt-3">
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">{(campaign.total_sent || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Enviados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">
                        {campaign.total_sent ? ((campaign.total_opened / campaign.total_sent) * 100).toFixed(1) : 0}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">Abertura</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">
                        {campaign.total_sent ? ((campaign.total_clicked / campaign.total_sent) * 100).toFixed(1) : 0}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">Cliques</p>
                    </div>
                    {campaign.ab_winner && campaign.ab_winner !== 'pending' && (
                      <div className="text-center">
                        <p className="text-sm font-bold text-gold">Versão {campaign.ab_winner.toUpperCase()}</p>
                        <p className="text-[10px] text-muted-foreground">Vencedora</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleAB(campaign)} title="A/B Test">
                    <TestTube size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(campaign)} title="Editar">
                    <Eye size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(campaign.id)} className="text-destructive hover:text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}