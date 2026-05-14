import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import {
  Zap, Plus, Trash2, Power, PowerOff, Webhook, ChevronRight,
  CheckCircle2, Clock, Filter, Mail, ArrowRight, Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

const TRIGGER_LABELS = {
  new_lead: 'Qualquer novo lead',
  new_lead_with_email: 'Novo lead com e-mail',
  new_lead_with_phone: 'Novo lead com WhatsApp',
};

const DELAY_OPTIONS = [
  { value: 0, label: 'Imediato' },
  { value: 5, label: '5 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 60, label: '1 hora' },
  { value: 1440, label: '1 dia' },
];

function RuleCard({ rule, campaigns, onToggle, onDelete }) {
  const campaign = campaigns.find(c => c.id === rule.campaign_id);
  const isActive = rule.active !== false;

  return (
    <div className={`bg-card border rounded-xl p-4 transition-all ${isActive ? 'border-border' : 'border-border/50 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
            <Zap size={15} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{rule.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {TRIGGER_LABELS[rule.trigger] || rule.trigger}
              </span>
              <ChevronRight size={10} className="text-muted-foreground" />
              <span className="text-[10px] bg-navy/10 text-navy px-2 py-0.5 rounded-full flex items-center gap-1">
                <Mail size={9} /> {rule.campaign_name || campaign?.name || 'Campanha removida'}
              </span>
              {rule.delay_minutes > 0 && (
                <>
                  <ChevronRight size={10} className="text-muted-foreground" />
                  <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={9} /> {DELAY_OPTIONS.find(d => d.value === rule.delay_minutes)?.label || `${rule.delay_minutes}min`}
                  </span>
                </>
              )}
              {rule.filter_state && (
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Filter size={9} /> {rule.filter_state}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-foreground">{rule.executions_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">disparos</p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={() => onToggle(rule)}
            className="scale-90"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(rule.id)}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {rule.send_once_per_contact && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <CheckCircle2 size={9} className="text-green-500" /> Envia apenas uma vez por contato
        </p>
      )}
    </div>
  );
}

function NewRuleForm({ campaigns, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [trigger, setTrigger] = useState('new_lead_with_email');
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [filterState, setFilterState] = useState('');
  const [sendOnce, setSendOnce] = useState(true);

  const selectedCampaign = campaigns.find(c => c.id === campaignId);

  const handleSubmit = () => {
    if (!name.trim()) return toast.error('Informe o nome da regra.');
    if (!campaignId) return toast.error('Selecione uma campanha.');
    onSave({
      name: name.trim(),
      campaign_id: campaignId,
      campaign_name: selectedCampaign?.name || '',
      trigger,
      delay_minutes: delayMinutes,
      filter_state: filterState || null,
      send_once_per_contact: sendOnce,
      active: true,
      executions_count: 0,
    });
  };

  return (
    <div className="bg-card border border-navy/30 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Settings2 size={15} className="text-navy" />
        <h3 className="text-sm font-semibold text-foreground">Nova Regra de Automação</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label className="text-xs">Nome da regra</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 h-9 text-sm"
            placeholder="Ex: Boas-vindas para novos leads"
          />
        </div>

        <div>
          <Label className="text-xs">Gatilho</Label>
          <Select value={trigger} onValueChange={setTrigger}>
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRIGGER_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Delay antes do envio</Label>
          <Select value={String(delayMinutes)} onValueChange={v => setDelayMinutes(Number(v))}>
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DELAY_OPTIONS.map(d => (
                <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label className="text-xs">Campanha a disparar</Label>
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue placeholder="Selecione uma campanha..." />
            </SelectTrigger>
            <SelectContent>
              {campaigns.filter(c => c.status !== 'enviado').map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <Mail size={11} /> {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCampaign && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Assunto: <span className="text-foreground">{selectedCampaign.subject_a || 'Sem assunto'}</span>
            </p>
          )}
        </div>

        <div>
          <Label className="text-xs">Filtrar por Estado (UF) <span className="text-muted-foreground">(opcional)</span></Label>
          <Input
            value={filterState}
            onChange={e => setFilterState(e.target.value.toUpperCase().slice(0, 2))}
            className="mt-1 h-9 text-sm"
            placeholder="Ex: SP, RJ..."
            maxLength={2}
          />
        </div>

        <div className="flex items-center gap-3 pt-5">
          <Switch checked={sendOnce} onCheckedChange={setSendOnce} />
          <Label className="text-xs cursor-pointer">Enviar apenas uma vez por contato</Label>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSubmit} size="sm" className="bg-navy text-white hover:bg-navy/90 h-9">
          <Zap size={12} className="mr-1.5" /> Criar Regra
        </Button>
        <Button onClick={onCancel} variant="outline" size="sm" className="h-9">Cancelar</Button>
      </div>
    </div>
  );
}

export default function LeadWebhookAutomation() {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['lead-automation-rules'],
    queryFn: () => base44.entities.LeadAutomationRule.list('-created_date', 50),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadAutomationRule.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-automation-rules'] });
      setShowForm(false);
      toast.success('Regra criada com sucesso!');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (rule) => base44.entities.LeadAutomationRule.update(rule.id, { active: !rule.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-automation-rules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadAutomationRule.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-automation-rules'] });
      toast.success('Regra removida.');
    },
  });

  const appId = appParams.appId || '';
  const webhookUrl = `https://backend.base44.app/api/apps/${appId}/functions/leadWebhook`;
  const activeRules = rules.filter(r => r.active !== false);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
            <Zap size={16} className="text-navy" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Automações por Webhook</h2>
            <p className="text-[11px] text-muted-foreground">Campanhas disparadas quando um lead chega pelo webhook</p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-navy text-white hover:bg-navy/90 h-8 text-xs"
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          <Plus size={12} className="mr-1" /> Nova Regra
        </Button>
      </div>

      {/* Status banner */}
      <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook size={13} className="text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Webhook ativo</span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <Badge variant="outline" className="text-[10px] h-5">
            {activeRules.length} regra{activeRules.length !== 1 ? 's' : ''} ativa{activeRules.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Flow diagram */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap mt-1">
          <span className="bg-background border border-border rounded-md px-2 py-1 font-mono">POST leadWebhook</span>
          <ArrowRight size={12} />
          <span className="bg-background border border-border rounded-md px-2 py-1">Contato criado/atualizado</span>
          <ArrowRight size={12} />
          <span className="bg-background border border-navy/30 text-navy rounded-md px-2 py-1 font-medium">
            Regras verificadas ({rules.length})
          </span>
          <ArrowRight size={12} />
          <span className="bg-background border border-border rounded-md px-2 py-1">📧 Campanha enviada</span>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <NewRuleForm
          campaigns={campaigns}
          onSave={createMutation.mutate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Rules list */}
      {rules.length === 0 && !showForm ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
          <Zap size={32} className="text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground font-medium">Nenhuma regra configurada</p>
          <p className="text-xs text-muted-foreground mt-1">Crie uma regra para disparar campanhas automaticamente quando leads chegarem</p>
          <Button
            size="sm"
            className="mt-4 bg-navy text-white hover:bg-navy/90"
            onClick={() => setShowForm(true)}
          >
            <Plus size={12} className="mr-1.5" /> Criar Primeira Regra
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              campaigns={campaigns}
              onToggle={toggleMutation.mutate}
              onDelete={deleteMutation.mutate}
            />
          ))}
        </div>
      )}
    </div>
  );
}