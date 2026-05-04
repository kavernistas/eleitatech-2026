import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Phone, MapPin, Tag, MessageSquare, Edit2, Save, Plus, Wand2, Bot } from 'lucide-react';
import WhatsAppButton from './WhatsAppButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const statusOptions = ['novo', 'contato_feito', 'interessado', 'proposta_enviada', 'fechado', 'atendimento_humano', 'inativo'];
const tagOptions = ['Urgente', 'Pendência 2024', 'CNPJ', 'Contas 2025', 'Respondeu', 'Prioridade Alta'];

export default function ContactDetail({ contact, statusColors, onClose }) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(contact.notes || '');
  const [generatingAi, setGeneratingAi] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.update(contact.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const handleStatusChange = (status) => updateMutation.mutate({ status });
  const handleSaveNotes = () => { updateMutation.mutate({ notes }); setEditingNotes(false); };
  const toggleTag = (tag) => {
    const tags = contact.tags || [];
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    updateMutation.mutate({ tags: next });
  };

  const handleGenerateAiSummary = async () => {
    setGeneratingAi(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Gere um resumo executivo conciso (máx 3 linhas) sobre este contato para uso interno de um escritório jurídico eleitoral:
Nome: ${contact.name || 'N/A'}
Partido: ${contact.party_name || 'N/A'} (${contact.party_acronym || 'N/A'})
Cidade/Estado: ${contact.city || 'N/A'} / ${contact.state || 'N/A'}
Status: ${contact.status || 'novo'}
Tags: ${(contact.tags || []).join(', ') || 'nenhuma'}
Interesse: ${contact.interest_area || 'nenhum'}
E-mails enviados: ${contact.emails_sent_count || 0} | Abertos: ${contact.emails_opened_count || 0} | Cliques: ${contact.clicks_count || 0}
Notas: ${contact.notes || 'nenhuma'}
Foque em: potencial de fechamento, urgências e próxima ação recomendada.`,
    });
    await updateMutation.mutateAsync({ ai_summary: result });
    setGeneratingAi(false);
  };

  const stats = [
    { label: 'E-mails Enviados', value: contact.emails_sent_count || 0 },
    { label: 'Aberturas', value: contact.emails_opened_count || 0 },
    { label: 'Cliques', value: contact.clicks_count || 0 },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-navy text-white rounded-xl flex items-center justify-center text-sm font-bold">
            {(contact.name || contact.email || '?').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{contact.name || 'Sem nome'}</h2>
            <p className="text-sm text-muted-foreground">{contact.party_name} {contact.party_acronym ? `(${contact.party_acronym})` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WhatsAppButton contact={contact} />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted lg:hidden">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground font-medium">Status:</span>
        <Select value={contact.status || 'novo'} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-7 text-xs w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(s => (
              <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-muted rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações</h3>
        {contact.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail size={13} className="text-muted-foreground" />
            <span className="text-foreground">{contact.email}</span>
            {contact.email_valid === false && <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Inválido</span>}
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone size={13} className="text-muted-foreground" />
            <span>{contact.phone}</span>
          </div>
        )}
        {(contact.city || contact.state) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={13} className="text-muted-foreground" />
            <span>{[contact.city, contact.state].filter(Boolean).join(', ')}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {tagOptions.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                (contact.tags || []).includes(tag)
                  ? 'bg-gold/15 border-gold/40 text-gold font-medium'
                  : 'bg-muted border-transparent text-muted-foreground hover:border-border'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações</h3>
          {!editingNotes ? (
            <button onClick={() => setEditingNotes(true)} className="text-xs text-primary flex items-center gap-1 hover:underline">
              <Edit2 size={11} /> Editar
            </button>
          ) : (
            <button onClick={handleSaveNotes} className="text-xs text-success flex items-center gap-1 hover:underline">
              <Save size={11} /> Salvar
            </button>
          )}
        </div>
        {editingNotes ? (
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[80px]" placeholder="Adicione observações sobre este contato..." />
        ) : (
          <p className="text-sm text-muted-foreground">{notes || 'Sem observações.'}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs border-navy/30 text-navy hover:bg-navy hover:text-white"
          onClick={handleGenerateAiSummary}
          disabled={generatingAi}
        >
          {generatingAi
            ? <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1.5" />Analisando...</>
            : <><Wand2 size={11} className="mr-1.5" />Gerar Resumo IA</>
          }
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => { onClose?.(); navigate('/ai-agent'); }}
        >
          <Bot size={11} className="mr-1.5" /> Abrir no Agente
        </Button>
      </div>

      {/* AI Summary */}
      {contact.ai_summary && (
        <div className="bg-navy/5 border border-navy/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-navy uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={11} /> Resumo da IA
            </h3>
            <button onClick={handleGenerateAiSummary} disabled={generatingAi} className="text-[10px] text-navy/60 hover:text-navy">
              {generatingAi ? '...' : '↻ Atualizar'}
            </button>
          </div>
          <p className="text-sm text-foreground/80">{contact.ai_summary}</p>
        </div>
      )}
    </div>
  );
}