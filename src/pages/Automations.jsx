import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Zap, Play, Pause, Trash2, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const triggerLabels = {
  cadastro_importacao: 'Cadastro ou Importação',
  clique_diagnostico: 'Clique no Link de Diagnóstico',
  abandono_24h: 'Abandono (abriu mas não clicou 24h)',
  status_change: 'Mudança de Status',
  tag_added: 'Tag Adicionada',
};

const actionLabels = {
  send_email: 'Enviar E-mail',
  send_sms: 'Enviar SMS',
  notify_crm: 'Notificar CRM',
  open_whatsapp_ai: 'Abrir Conversa IA no WhatsApp',
  change_status: 'Mudar Status do Lead',
  add_tag: 'Adicionar Tag',
};

const triggerColors = {
  cadastro_importacao: 'bg-blue-100 text-blue-700',
  clique_diagnostico: 'bg-gold/15 text-gold',
  abandono_24h: 'bg-orange-100 text-orange-700',
  status_change: 'bg-purple-100 text-purple-700',
  tag_added: 'bg-green-100 text-green-700',
};

const defaultAutomations = [
  { name: 'Boas-vindas Automático', trigger: 'cadastro_importacao', action: 'send_email', delay_hours: 0, active: true, executions_count: 423 },
  { name: 'Follow-up Diagnóstico', trigger: 'clique_diagnostico', action: 'notify_crm', delay_hours: 0, active: true, executions_count: 187 },
  { name: 'SMS Remarketing', trigger: 'abandono_24h', action: 'send_sms', delay_hours: 24, active: true, executions_count: 94 },
];

export default function Automations() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: '', action: '', delay_hours: 0 });
  const qc = useQueryClient();

  const { data: automations = [] } = useQuery({
    queryKey: ['automations'],
    queryFn: () => base44.entities.Automation.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Automation.create({ ...data, active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automations'] }); setShowNew(false); setForm({ name: '', trigger: '', action: '', delay_hours: 0 }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Automation.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Automation.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });

  const allAutomations = automations.length > 0 ? automations : defaultAutomations;

  return (
    <div className="p-5 lg:p-7 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-foreground">Automações</h1>
          <p className="text-muted-foreground text-sm">Fluxos multicanal baseados em comportamento</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-navy text-white hover:bg-navy/90">
          <Plus size={14} className="mr-1.5" /> Nova Automação
        </Button>
      </div>

      {/* Flow preview */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Fluxo Ativo — Partidos Eleições 2026</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { label: 'Importação', sub: '4.264 contatos', color: 'bg-navy' },
            { label: 'E-mail Boas-vindas', sub: 'Imediato', color: 'bg-blue-500' },
            { label: 'Aguarda 48h', sub: 'Sem resposta?', color: 'bg-muted border border-border text-foreground' },
            { label: 'E-mail de Diagnóstico', sub: 'Link CTA', color: 'bg-gold' },
            { label: 'Abriu sem Clicar?', sub: '24h depois', color: 'bg-orange-500' },
            { label: 'WhatsApp Reforço', sub: 'IA automática', color: 'bg-green-600' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <div className={`${step.color} text-white rounded-lg px-3 py-2 text-center min-w-[100px]`}>
                <p className="text-xs font-semibold">{step.label}</p>
                <p className="text-[10px] opacity-75 mt-0.5">{step.sub}</p>
              </div>
              {i < 5 && <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Automations list */}
      <div className="space-y-3">
        {allAutomations.map((auto, i) => (
          <div key={auto.id || i} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground text-sm">{auto.name}</h3>
                {auto.active ? (
                  <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">Ativa</span>
                ) : (
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Pausada</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${triggerColors[auto.trigger] || 'bg-muted text-muted-foreground'}`}>
                  {triggerLabels[auto.trigger] || auto.trigger}
                </span>
                <ArrowRight size={10} className="text-muted-foreground" />
                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {actionLabels[auto.action] || auto.action}
                </span>
                {auto.delay_hours > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={10} /> {auto.delay_hours}h depois
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">{(auto.executions_count || 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Execuções</p>
              </div>
              {auto.id && (
                <>
                  <Switch
                    checked={auto.active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: auto.id, active: v })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(auto.id)} className="text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New automation dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-playfair">Nova Automação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 h-9 text-sm" placeholder="Ex: SMS após abandono" />
            </div>
            <div>
              <Label className="text-xs">Gatilho (Quando acontece?)</Label>
              <Select value={form.trigger} onValueChange={v => setForm({ ...form, trigger: v })}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Selecione o gatilho" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(triggerLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ação (O que fazer?)</Label>
              <Select value={form.action} onValueChange={v => setForm({ ...form, action: v })}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Selecione a ação" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(actionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Atraso (horas)</Label>
              <Input type="number" value={form.delay_hours} onChange={e => setForm({ ...form, delay_hours: parseInt(e.target.value) || 0 })} className="mt-1 h-9 text-sm" min={0} />
            </div>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.trigger || !form.action} className="w-full bg-navy text-white">
              <Zap size={13} className="mr-1.5" /> Criar Automação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}