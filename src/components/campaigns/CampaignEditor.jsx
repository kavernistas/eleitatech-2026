import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Wand2, Save, Eye, EyeOff, Plus,
  Type, AlignLeft, MousePointer, Minus, Image, Clock, CalendarClock, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmailBlock from './EmailBlock';
import EmailPreview from './EmailPreview';

const PLACEHOLDERS = [
  { label: '{{nome_responsavel}}', desc: 'Nome do responsável' },
  { label: '{{nome_partido}}', desc: 'Nome do partido' },
  { label: '{{sigla_partido}}', desc: 'Sigla (ex: PT)' },
  { label: '{{cidade}}', desc: 'Cidade do contato' },
  { label: '{{estado}}', desc: 'Estado (UF)' },
  { label: '{{email}}', desc: 'E-mail do contato' },
  { label: '{{cnpj}}', desc: 'CNPJ do diretório' },
  { label: '{{assunto_campanha}}', desc: 'Assunto da campanha' },
];

const BLOCK_TYPES = [
  { type: 'header', label: 'Título', icon: Type },
  { type: 'subheader', label: 'Subtítulo', icon: Type },
  { type: 'text', label: 'Parágrafo', icon: AlignLeft },
  { type: 'button', label: 'Botão CTA', icon: MousePointer },
  { type: 'image', label: 'Imagem', icon: Image },
  { type: 'divider', label: 'Divisor', icon: Minus },
];

const defaultContent = (type) => {
  if (type === 'header') return 'Regularize seu Partido para as Eleições 2026';
  if (type === 'subheader') return 'Diagnostique a situação jurídica do seu diretório';
  if (type === 'text') return 'Prezado(a) {{nome_responsavel}},\n\nSua diretoria partidária pode estar enfrentando pendências junto à Justiça Eleitoral que precisam ser resolvidas com urgência.';
  if (type === 'button') return 'Solicitar Diagnóstico Gratuito';
  return '';
};

const initBlocks = [
  { id: 1, type: 'header', content: 'Regularize seu Partido para as Eleições 2026' },
  { id: 2, type: 'text', content: 'Prezado(a) {{nome_responsavel}},\n\nSua diretoria partidária pode estar enfrentando pendências junto à Justiça Eleitoral que precisam ser resolvidas com urgência.\n\nNosso escritório especializado em Direito Eleitoral oferece um diagnóstico gratuito para identificar se o {{nome_partido}} ({{sigla_partido}}) possui irregularidades em {{cidade}}-{{estado}}.' },
  { id: 3, type: 'button', content: 'Solicitar Diagnóstico Gratuito', url: 'https://escritorio.adv.br/diagnostico' },
  { id: 4, type: 'text', content: 'Atenciosamente,\nDr. Marcos\nEspecialista em Direito Eleitoral' },
];

export default function CampaignEditor({ campaign, onBack }) {
  const [name, setName] = useState(campaign?.name || '');
  const [subject, setSubject] = useState(campaign?.subject_a || '');
  const [previewText, setPreviewText] = useState(campaign?.preview_text || '');
  const [senderName, setSenderName] = useState(campaign?.sender_name || 'Marcos Eduardo - Contador Partidário e Eleitoral');
  const [blocks, setBlocks] = useState(() => {
    if (campaign?.blocks_json) {
      try { return JSON.parse(campaign.blocks_json); } catch { /* fall through */ }
    }
    return initBlocks;
  });
  const [showPreview, setShowPreview] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTone, setAiTone] = useState('formal');
  const [activeTextBlockId, setActiveTextBlockId] = useState(null);
  // Scheduling
  const [scheduleMode, setScheduleMode] = useState(!!campaign?.scheduled_at); // true = agendado
  const [schedDate, setSchedDate] = useState(
    campaign?.scheduled_at ? campaign.scheduled_at.slice(0, 10) : ''
  );
  const [schedTime, setSchedTime] = useState(
    campaign?.scheduled_at ? campaign.scheduled_at.slice(11, 16) : '08:00'
  );
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => campaign
      ? base44.entities.Campaign.update(campaign.id, data)
      : base44.entities.Campaign.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campanha salva com sucesso!');
      onBack();
    },
    onError: (err) => {
      toast.error('Erro ao salvar campanha: ' + (err?.message || 'Tente novamente.'));
    },
  });

  const addBlock = (type) => {
    const newBlock = { id: Date.now(), type, content: defaultContent(type), url: type === 'button' ? '' : undefined };
    setBlocks(prev => [...prev, newBlock]);
  };

  const updateBlock = (id, field, value) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBlock = (id) => setBlocks(prev => prev.filter(b => b.id !== id));

  const moveBlock = (id, dir) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const insertPlaceholder = (placeholder) => {
    // Insert at cursor if a textarea is focused, else append to last text block
    const activeEl = document.activeElement;
    if (activeEl && activeEl.tagName === 'TEXTAREA') {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      const blockId = parseInt(activeEl.closest('[data-block-id]')?.dataset.blockId);
      if (blockId) {
        const block = blocks.find(b => b.id === blockId);
        if (block) {
          const newContent = block.content.slice(0, start) + placeholder + block.content.slice(end);
          updateBlock(blockId, 'content', newContent);
          setTimeout(() => {
            activeEl.focus();
            activeEl.setSelectionRange(start + placeholder.length, start + placeholder.length);
          }, 0);
          return;
        }
      }
    }
    // Fallback: append to last text block or create new
    const lastText = [...blocks].reverse().find(b => b.type === 'text');
    if (lastText) {
      updateBlock(lastText.id, 'content', lastText.content + ' ' + placeholder);
    }
  };

  const handleAiImprove = async () => {
    setAiLoading(true);
    const bodyText = blocks.filter(b => b.type === 'text').map(b => b.content).join('\n\n');
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um redator jurídico especializado em comunicação com partidos políticos brasileiros para as eleições de 2026.
Tom desejado: ${aiTone === 'formal' ? 'formal e profissional' : aiTone === 'urgente' ? 'urgente e persuasivo' : 'amigável e próximo'}.

Melhore SOMENTE o texto abaixo mantendo os placeholders {{nome_responsavel}}, {{nome_partido}}, {{sigla_partido}}, {{cidade}}, {{estado}} onde fizer sentido.
Foco em: regularização de CNPJ partidário, prestação de contas eleitorais 2025, compliance eleitoral.

Retorne APENAS o texto melhorado, sem explicações adicionais.

Texto atual:
${bodyText}`,
      });
      // Update first text block with improved content
      const firstTextBlock = blocks.find(b => b.type === 'text');
      if (firstTextBlock) updateBlock(firstTextBlock.id, 'content', result);
    } finally {
      setAiLoading(false);
    }
  };

  const buildHtml = () => blocks.map(b => {
    if (b.type === 'header') return `<h1 style="font-family:Georgia,serif;color:#1e3a5f;font-size:22px;font-weight:700;margin:0 0 12px 0;">${b.content}</h1>`;
    if (b.type === 'subheader') return `<h2 style="font-family:Arial,sans-serif;color:#2d4a7a;font-size:16px;font-weight:600;margin:0 0 10px 0;">${b.content}</h2>`;
    if (b.type === 'text') return `<p style="font-family:Arial,sans-serif;color:#374151;font-size:14px;line-height:1.75;margin:0 0 14px 0;white-space:pre-wrap;">${b.content}</p>`;
    if (b.type === 'divider') return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">`;
    if (b.type === 'button') {
      // URL may contain placeholders like {{sigla_partido}} — keep as-is, will be resolved at send time
      const btnUrl = b.url || '#';
      return `<div style="text-align:center;margin:20px 0;"><a href="${btnUrl}" style="display:inline-block;background:#1e3a5f;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:700;">${b.content}</a></div>`;
    }
    if (b.type === 'image' && b.url) return `<div style="margin:12px 0;"><img src="${b.url}" alt="${b.alt || ''}" style="max-width:100%;border-radius:6px;"></div>`;
    return '';
  }).join('');

  const scheduledAt = scheduleMode && schedDate
    ? new Date(`${schedDate}T${schedTime || '08:00'}:00`).toISOString()
    : null;

  const handleSave = () => {
    const payload = {
      name, subject_a: subject, preview_text: previewText,
      sender_name: senderName, html_body: buildHtml(),
      blocks_json: JSON.stringify(blocks), type: 'email_marketing',
    };
    if (scheduleMode && scheduledAt) {
      payload.status = 'agendado';
      payload.scheduled_at = scheduledAt;
    } else {
      payload.status = 'rascunho';
      payload.scheduled_at = null;
    }
    saveMutation.mutate(payload);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 bg-card border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8">
          <ArrowLeft size={14} className="mr-1.5" /> Voltar
        </Button>
        <div className="flex-1">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-8 text-sm font-semibold border-none bg-transparent p-0 focus-visible:ring-0"
            placeholder="Nome da campanha..."
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setShowPreview(p => !p)}
        >
          {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
          {showPreview ? 'Editar' : 'Prévia'}
        </Button>
        {scheduleMode && scheduledAt && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-gold bg-gold/10 border border-gold/30 px-2.5 py-1 rounded-full font-medium">
            <CalendarClock size={12} />
            {new Date(scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        )}
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="h-8 bg-navy text-white hover:bg-navy/90" size="sm">
          <Save size={13} className="mr-1.5" />
          {scheduleMode && scheduledAt ? 'Agendar' : 'Salvar'}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ---- LEFT PANEL: Settings + Blocks ---- */}
        <div className={`${showPreview ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 xl:w-96 flex-shrink-0 border-r border-border overflow-y-auto bg-muted/30`}>
          <div className="p-4 space-y-4">
            {/* Email meta */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Configurações</h3>
              <div>
                <Label className="text-xs">Assunto</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 h-8 text-sm" placeholder="Assunto do e-mail..." />
              </div>
              <div>
                <Label className="text-xs">Pré-visualização (inbox)</Label>
                <Input value={previewText} onChange={e => setPreviewText(e.target.value)} className="mt-1 h-8 text-sm" placeholder="Texto antes de abrir..." />
              </div>
              <div>
                <Label className="text-xs">Nome do Remetente</Label>
                <Input value={senderName} onChange={e => setSenderName(e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
            </div>

            {/* AI */}
            <div className="bg-gradient-to-br from-navy/5 to-gold/5 border border-navy/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 size={14} className="text-gold" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">IA Redatora</h3>
              </div>
              <Select value={aiTone} onValueChange={setAiTone}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal e Profissional</SelectItem>
                  <SelectItem value="urgente">Urgente e Persuasivo</SelectItem>
                  <SelectItem value="amigavel">Amigável e Próximo</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAiImprove} disabled={aiLoading} variant="outline" size="sm" className="w-full border-navy/30 text-navy hover:bg-navy hover:text-white h-8 text-xs">
                {aiLoading ? <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1.5" />Melhorando...</> : <><Wand2 size={11} className="mr-1.5" />Melhorar com IA</>}
              </Button>
            </div>

            {/* Placeholders */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Inserir Placeholder</h3>
              <p className="text-[10px] text-muted-foreground mb-2.5">Clique para inserir no bloco de texto ativo</p>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => insertPlaceholder(p.label)}
                    title={p.desc}
                    className="bg-navy/8 border border-navy/20 text-navy text-[10px] font-mono px-2 py-1 rounded hover:bg-navy hover:text-white transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scheduling */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Agendamento</h3>
                </div>
                <button
                  onClick={() => setScheduleMode(p => !p)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${scheduleMode ? 'bg-navy' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${scheduleMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {scheduleMode ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Data</Label>
                    <input
                      type="date"
                      value={schedDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => setSchedDate(e.target.value)}
                      className="mt-1 w-full h-8 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hora</Label>
                    <input
                      type="time"
                      value={schedTime}
                      onChange={e => setSchedTime(e.target.value)}
                      className="mt-1 w-full h-8 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  {scheduledAt && (
                    <p className="text-[11px] text-gold bg-gold/10 border border-gold/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
                      <CalendarClock size={11} />
                      Envio agendado para {new Date(scheduledAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                    </p>
                  )}
                  {scheduleMode && !schedDate && (
                    <p className="text-[11px] text-muted-foreground">Selecione uma data para agendar.</p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Ative para definir data e hora de envio automático.</p>
              )}
            </div>

            {/* Add blocks */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Adicionar Bloco</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => addBlock(type)}
                    className="flex items-center gap-1.5 p-2 rounded-lg border border-dashed border-border hover:border-navy hover:bg-navy/5 text-xs text-muted-foreground hover:text-navy transition-colors"
                  >
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---- CENTER/RIGHT: Editor or Preview ---- */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showPreview ? (
            /* PREVIEW MODE */
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              <EmailPreview subject={subject} previewText={previewText} blocks={blocks} senderName={senderName} />
            </div>
          ) : (
            /* EDITOR MODE */
            <div className="flex flex-1 overflow-hidden">
              {/* Block canvas */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="max-w-2xl mx-auto space-y-2">
                  {blocks.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
                      <Plus size={32} className="text-muted-foreground mx-auto mb-2 opacity-30" />
                      <p className="text-sm text-muted-foreground">Adicione blocos no painel esquerdo</p>
                    </div>
                  ) : (
                    blocks.map((block, idx) => (
                      <div key={block.id} data-block-id={block.id}>
                        <EmailBlock
                          block={block}
                          onChange={(field, val) => updateBlock(block.id, field, val)}
                          onRemove={() => removeBlock(block.id)}
                          onMoveUp={() => moveBlock(block.id, 'up')}
                          onMoveDown={() => moveBlock(block.id, 'down')}
                          isFirst={idx === 0}
                          isLast={idx === blocks.length - 1}
                        />
                      </div>
                    ))
                  )}
                  <button
                    onClick={() => addBlock('text')}
                    className="w-full py-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-navy hover:text-navy hover:bg-navy/3 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={13} /> Adicionar Parágrafo
                  </button>
                </div>
              </div>

              {/* Side mini-preview (desktop only) */}
              <div className="hidden xl:flex flex-col w-[340px] flex-shrink-0 border-l border-border bg-muted/20 overflow-hidden">
                <div className="p-3 border-b border-border flex items-center gap-2">
                  <Eye size={13} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prévia em Tempo Real</span>
                </div>
                <div className="flex-1 overflow-hidden p-2 scale-[0.85] origin-top">
                  <EmailPreview subject={subject} previewText={previewText} blocks={blocks} senderName={senderName} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}