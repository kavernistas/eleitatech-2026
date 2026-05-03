import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Wand2, Save, Send, Plus, Trash2, Type, Image, MousePointer, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const defaultBlocks = [
  { id: 1, type: 'header', content: 'Regularize seu Partido para as Eleições 2026' },
  { id: 2, type: 'text', content: 'Prezado(a) {{nome_responsavel}},\n\nSua diretoria partidária pode estar enfrentando pendências junto à Justiça Eleitoral que precisam ser resolvidas com urgência.' },
  { id: 3, type: 'button', content: 'Solicitar Diagnóstico Gratuito', url: '#diagnostico' },
];

export default function CampaignEditor({ campaign, onBack }) {
  const [name, setName] = useState(campaign?.name || '');
  const [subject, setSubject] = useState(campaign?.subject_a || '');
  const [previewText, setPreviewText] = useState(campaign?.preview_text || '');
  const [blocks, setBlocks] = useState(defaultBlocks);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTone, setAiTone] = useState('formal');
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => campaign
      ? base44.entities.Campaign.update(campaign.id, data)
      : base44.entities.Campaign.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); onBack(); },
  });

  const handleAiImprove = async () => {
    setAiLoading(true);
    const bodyText = blocks.map(b => b.content).join('\n\n');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um redator jurídico especializado em comunicação com partidos políticos brasileiros para as eleições de 2026. 
      Melhore este texto de e-mail com tom ${aiTone === 'formal' ? 'formal e profissional' : 'urgente e persuasivo'}:
      
      Assunto: ${subject}
      Corpo: ${bodyText}
      
      Retorne apenas o texto melhorado, mantendo os marcadores {{nome_responsavel}} onde relevante. 
      Foque em: regularização de CNPJ partidário, prestação de contas eleitorais 2025, e compliance eleitoral.`,
    });
    setSubject(result.split('\n')[0]?.replace(/^(Assunto:|Subject:)/i, '').trim() || subject);
    setAiLoading(false);
  };

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: type === 'button' ? 'Clique Aqui' : type === 'header' ? 'Título' : 'Digite seu texto...',
      url: type === 'button' ? '#' : undefined,
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id, field, value) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBlock = (id) => setBlocks(blocks.filter(b => b.id !== id));

  const handleSave = () => {
    const html = blocks.map(b => {
      if (b.type === 'header') return `<h1 style="font-family:Georgia,serif;color:#1e3a5f;font-size:24px;">${b.content}</h1>`;
      if (b.type === 'button') return `<a href="${b.url}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">${b.content}</a>`;
      return `<p style="font-family:Arial,sans-serif;color:#333;line-height:1.7;">${b.content.replace(/\n/g, '<br>')}</p>`;
    }).join('<br>');
    saveMutation.mutate({ name, subject_a: subject, preview_text: previewText, html_body: html, status: 'rascunho', type: 'email_marketing' });
  };

  return (
    <div className="p-5 lg:p-7 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={14} className="mr-1.5" /> Voltar
        </Button>
        <div className="flex-1">
          <h1 className="font-playfair text-xl font-bold">{campaign ? 'Editar Campanha' : 'Nova Campanha'}</h1>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-navy text-white">
          <Save size={13} className="mr-1.5" /> Salvar
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: settings */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Configurações</h3>
            <div>
              <Label className="text-xs">Nome da Campanha</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1 h-9 text-sm" placeholder="Ex: Disparo Semanal - Maio 2026" />
            </div>
            <div>
              <Label className="text-xs">Assunto do E-mail</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 h-9 text-sm" placeholder="Ex: Urgente: Prazo CNPJ se encerra em 30 dias" />
            </div>
            <div>
              <Label className="text-xs">Texto de Pré-visualização</Label>
              <Input value={previewText} onChange={e => setPreviewText(e.target.value)} className="mt-1 h-9 text-sm" placeholder="Aparece antes de abrir o e-mail..." />
            </div>
          </div>

          {/* AI Assistant */}
          <div className="bg-gradient-to-br from-navy/5 to-gold/5 border border-navy/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 size={16} className="text-gold" />
              <h3 className="text-sm font-semibold text-foreground">Assistente de Redação com IA</h3>
            </div>
            <div>
              <Label className="text-xs">Tom de Voz</Label>
              <Select value={aiTone} onValueChange={setAiTone}>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal e Profissional</SelectItem>
                  <SelectItem value="urgente">Urgente e Persuasivo</SelectItem>
                  <SelectItem value="amigavel">Amigável e Próximo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAiImprove} disabled={aiLoading} variant="outline" className="w-full border-navy/30 text-navy hover:bg-navy hover:text-white">
              {aiLoading ? (
                <><span className="w-3 h-3 border border-navy border-t-transparent rounded-full animate-spin mr-2" />Melhorando...</>
              ) : (
                <><Wand2 size={13} className="mr-1.5" />Melhorar com IA</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground">A IA irá sugerir melhorias no assunto e ajustar o tom conforme selecionado.</p>
          </div>

          {/* Block toolbox */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Adicionar Bloco</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'header', label: 'Título', icon: Type },
                { type: 'text', label: 'Texto', icon: AlignLeft },
                { type: 'button', label: 'Botão CTA', icon: MousePointer },
              ].map(({ type, label, icon: Icon }) => (
                <button key={type} onClick={() => addBlock(type)} className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:border-navy hover:bg-navy/5 text-sm text-muted-foreground hover:text-navy transition-colors">
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: editor */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Editor de Conteúdo</h3>
          <div className="bg-white border border-border rounded-xl p-4 space-y-3 min-h-[400px]">
            {blocks.map(block => (
              <div key={block.id} className="group relative bg-muted/40 rounded-lg p-3 border border-transparent hover:border-navy/30">
                <button onClick={() => removeBlock(block.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity">
                  <Trash2 size={12} />
                </button>
                {block.type === 'header' && (
                  <Input value={block.content} onChange={e => updateBlock(block.id, 'content', e.target.value)} className="text-lg font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0" />
                )}
                {block.type === 'text' && (
                  <Textarea value={block.content} onChange={e => updateBlock(block.id, 'content', e.target.value)} className="border-none bg-transparent p-0 text-sm focus-visible:ring-0 resize-none min-h-[80px]" />
                )}
                {block.type === 'button' && (
                  <div className="space-y-2">
                    <Input value={block.content} onChange={e => updateBlock(block.id, 'content', e.target.value)} className="text-sm border-none bg-transparent p-0 h-auto focus-visible:ring-0 font-semibold" />
                    <Input value={block.url} onChange={e => updateBlock(block.id, 'url', e.target.value)} className="text-xs h-7 text-muted-foreground" placeholder="URL do botão" />
                    <div className="flex justify-center">
                      <span className="inline-block bg-navy text-white text-sm px-5 py-2 rounded-lg font-medium">{block.content}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Variable helper */}
          <div className="bg-muted rounded-lg p-3 text-xs">
            <p className="font-semibold text-foreground mb-1.5">Variáveis Dinâmicas:</p>
            <div className="flex flex-wrap gap-1.5">
              {['{{nome_responsavel}}', '{{nome_partido}}', '{{sigla_partido}}', '{{cidade}}', '{{estado}}'].map(v => (
                <span key={v} className="bg-navy/10 text-navy px-2 py-0.5 rounded font-mono text-[11px] cursor-pointer hover:bg-navy/20">{v}</span>
              ))}
            </div>
            <p className="text-muted-foreground mt-1.5">{"Se {{nome_responsavel}} estiver vazio → usa \"Prezado(a) Responsável\""}</p>
          </div>
        </div>
      </div>
    </div>
  );
}