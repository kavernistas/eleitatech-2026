import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Code, Eye, Trash2, Copy, CheckCircle, FileText, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

const defaultFields = [
  { id: 1, label: 'Nome do Responsável', type: 'text', required: true },
  { id: 2, label: 'E-mail', type: 'email', required: true },
  { id: 3, label: 'Partido', type: 'text', required: true },
  { id: 4, label: 'Telefone/WhatsApp', type: 'tel', required: false },
];

export default function Forms() {
  const [showNew, setShowNew] = useState(false);
  const [previewForm, setPreviewForm] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'formulario_embutido',
    headline: 'Diagnóstico Jurídico Gratuito para seu Partido',
    subheadline: 'Saiba se seu partido está regularizado para as Eleições 2026',
    cta_text: 'Solicitar Diagnóstico Gratuito',
  });
  const qc = useQueryClient();

  const { data: forms = [] } = useQuery({
    queryKey: ['lead-forms'],
    queryFn: () => base44.entities.LeadForm.list('-created_date', 20),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadForm.create({ ...data, fields: defaultFields, active: true, leads_captured: 0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lead-forms'] }); setShowNew(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadForm.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-forms'] }),
  });

  const getEmbedCode = (f) =>
    `<iframe src="https://app.legaltech2026.com.br/form/${f.id}" width="100%" height="520" frameborder="0" style="border-radius:12px;"></iframe>`;

  const copyCode = (f) => {
    navigator.clipboard.writeText(getEmbedCode(f));
    setCopied(f.id);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeIcons = { popup: Layers, formulario_embutido: FileText, landing_page: Eye };
  const typeLabels = { popup: 'Pop-up', formulario_embutido: 'Formulário Embutido', landing_page: 'Landing Page' };

  return (
    <div className="p-5 lg:p-7 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-foreground">Formulários & Pop-ups</h1>
          <p className="text-muted-foreground text-sm">Capture leads em sites parceiros</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-navy text-white hover:bg-navy/90">
          <Plus size={14} className="mr-1.5" /> Novo Formulário
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {[
            { type: 'popup', desc: 'Aparece automaticamente em sites parceiros' },
            { type: 'formulario_embutido', desc: 'Embuta direto no HTML do site' },
            { type: 'landing_page', desc: 'Página dedicada de captação' },
          ].map(({ type, desc }) => {
            const Icon = typeIcons[type];
            return (
              <div
                key={type}
                onClick={() => { setForm({ ...form, type, name: typeLabels[type] + ' Padrão' }); setShowNew(true); }}
                className="bg-card border border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-navy hover:bg-navy/5 transition-colors card-hover group"
              >
                <div className="w-12 h-12 bg-muted group-hover:bg-navy/10 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors">
                  <Icon size={22} className="text-muted-foreground group-hover:text-navy" />
                </div>
                <p className="font-semibold text-foreground">{typeLabels[type]}</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4">
          {forms.map(f => {
            const Icon = typeIcons[f.type] || FileText;
            return (
              <div key={f.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center">
                      <Icon size={18} className="text-navy" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{f.name}</h3>
                      <p className="text-xs text-muted-foreground">{f.headline}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{typeLabels[f.type]}</span>
                        <span className="text-[10px] text-success font-semibold">{f.leads_captured || 0} leads capturados</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setPreviewForm(f)} className="text-xs h-8">
                      <Eye size={12} className="mr-1" /> Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copyCode(f)} className="text-xs h-8">
                      {copied === f.id ? <CheckCircle size={12} className="mr-1 text-success" /> : <Code size={12} className="mr-1" />}
                      {copied === f.id ? 'Copiado!' : 'Embed'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(f.id)} className="text-destructive h-8">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Form Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-playfair">Novo Formulário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 h-9 text-sm" placeholder="Nome do formulário" />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popup">Pop-up</SelectItem>
                    <SelectItem value="formulario_embutido">Formulário Embutido</SelectItem>
                    <SelectItem value="landing_page">Landing Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Título do Formulário</Label>
              <Input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Subtítulo</Label>
              <Input value={form.subheadline} onChange={e => setForm({ ...form, subheadline: e.target.value })} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Texto do Botão CTA</Label>
              <Input value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} className="mt-1 h-9 text-sm" />
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs font-semibold text-foreground mb-1.5">Campos padrão incluídos:</p>
              {defaultFields.map(f => (
                <div key={f.id} className="flex items-center justify-between text-xs text-muted-foreground py-0.5">
                  <span>{f.label}</span>
                  {f.required && <span className="text-destructive text-[10px]">obrigatório</span>}
                </div>
              ))}
            </div>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name} className="w-full bg-navy text-white">
              <Plus size={13} className="mr-1.5" /> Criar Formulário
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewForm && (
        <Dialog open onOpenChange={() => setPreviewForm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Preview — {previewForm.name}</DialogTitle>
            </DialogHeader>
            <div className="bg-gradient-to-br from-navy to-navy-dark rounded-xl p-6 text-white">
              <h2 className="font-playfair text-lg font-bold mb-1">{previewForm.headline}</h2>
              <p className="text-white/70 text-sm mb-5">{previewForm.subheadline}</p>
              <div className="space-y-3">
                {defaultFields.map(f => (
                  <input key={f.id} type={f.type} placeholder={f.label} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/50 outline-none" />
                ))}
              </div>
              <button className="w-full mt-4 gradient-gold text-white font-semibold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity">
                {previewForm.cta_text}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}