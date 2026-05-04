import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, X, Send, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'prospeccao_cnpj',
    name: '📋 Regularização de CNPJ',
    description: 'Prospecção para pendências de CNPJ partidário',
    subject: (c) => `${c.party_acronym || c.party_name || 'Diretório'} - Regularização CNPJ 2026 - Diagnóstico Gratuito`,
    preview: 'Identificamos pendências de regularização do CNPJ do seu diretório partidário para 2026...',
  },
  {
    id: 'prospeccao_contas',
    name: '📊 Prestação de Contas 2025',
    description: 'Prospecção para prestação de contas TSE/TRE',
    subject: (c) => `${c.party_acronym || c.party_name || 'Diretório'} - Prestação de Contas 2025 - Suporte Especializado`,
    preview: 'O prazo para entrega da prestação de contas 2025 ao TSE/TRE está se aproximando...',
  },
  {
    id: 'prospeccao_geral',
    name: '⚖️ Assessoria Eleitoral Completa',
    description: 'Proposta geral de assessoria jurídica eleitoral',
    subject: (c) => `${c.party_acronym || c.party_name || 'Diretório'} - Assessoria Jurídica Eleitoral 2026`,
    preview: 'Seu diretório está preparado para as eleições de 2026? Nossa equipe pode ajudar...',
  },
];

export default function BulkEmailModal({ contacts, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [step, setStep] = useState('config'); // config | sending | done
  const [progress, setProgress] = useState({ sent: 0, failed: 0, skipped: 0, total: 0 });
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);

  const template = TEMPLATES.find(t => t.id === selectedTemplate);
  const validContacts = contacts.filter(c => c.email && c.email_valid !== false);
  const invalidCount = contacts.length - validContacts.length;

  async function handleSend() {
    setStep('sending');
    setProgress({ sent: 0, failed: 0, skipped: 0, total: validContacts.length });
    const errs = [];

    for (let i = 0; i < validContacts.length; i++) {
      const contact = validContacts[i];
      try {
        await base44.functions.invoke('sendProspectEmail', {
          contact,
          template_id: selectedTemplate,
        });
        setProgress(p => ({ ...p, sent: p.sent + 1 }));
      } catch (e) {
        errs.push({ contact, error: e.message });
        setProgress(p => ({ ...p, failed: p.failed + 1 }));
      }
      if (i < validContacts.length - 1) await new Promise(r => setTimeout(r, 150));
    }

    setErrors(errs);
    setProgress(p => ({ ...p, skipped: invalidCount }));
    setStep('done');
  }

  const pct = progress.total > 0 ? Math.round(((progress.sent + progress.failed) / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-navy text-white">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-gold" />
            <h2 className="font-semibold text-base">Disparo de E-mails</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {step === 'config' && (
            <>
              <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{contacts.length.toLocaleString('pt-BR')} contatos selecionados</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {validContacts.length} válidos para envio
                    {invalidCount > 0 && ` · ${invalidCount} sem e-mail ou inválidos`}
                  </p>
                </div>
                <Badge className="bg-navy text-white">{validContacts.length} envios</Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Escolha o template</p>
                <div className="space-y-2">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        selectedTemplate === t.id ? 'border-navy bg-navy/5' : 'border-border hover:border-navy/30'
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1 italic line-clamp-1">"{t.preview}"</p>
                    </button>
                  ))}
                </div>
              </div>

              {template && validContacts.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">Assunto (exemplo)</p>
                  <p className="text-xs text-blue-800">{template.subject(validContacts[0])}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
                <Button
                  className="flex-1 bg-navy text-white hover:bg-navy/90"
                  disabled={validContacts.length === 0}
                  onClick={handleSend}
                >
                  <Send size={14} className="mr-1.5" />
                  Disparar {validContacts.length.toLocaleString('pt-BR')} e-mails
                </Button>
              </div>
            </>
          )}

          {step === 'sending' && (
            <div className="text-center py-4 space-y-4">
              <Loader2 size={40} className="animate-spin text-navy mx-auto" />
              <div>
                <p className="font-semibold text-foreground">Enviando e-mails...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {progress.sent + progress.failed} de {progress.total} processados
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="bg-navy h-2.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-center gap-6 text-sm">
                <span className="text-green-600 font-medium">{progress.sent} enviados</span>
                {progress.failed > 0 && <span className="text-red-500 font-medium">{progress.failed} erros</span>}
              </div>
              <p className="text-xs text-muted-foreground">Não feche esta janela...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-2 space-y-4">
              <CheckCircle size={48} className="text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-foreground text-lg">Disparo concluído!</p>
                <p className="text-sm text-muted-foreground mt-1">Relatório de envio</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-600">{progress.sent}</p>
                  <p className="text-xs text-green-700 mt-0.5">Enviados</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-2xl font-bold text-red-500">{progress.failed}</p>
                  <p className="text-xs text-red-600 mt-0.5">Erros</p>
                </div>
                <div className="bg-muted border border-border rounded-xl p-3">
                  <p className="text-2xl font-bold text-muted-foreground">{progress.skipped}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Ignorados</p>
                </div>
              </div>

              {errors.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowErrors(v => !v)}
                    className="text-xs text-red-500 flex items-center gap-1 mx-auto"
                  >
                    <AlertCircle size={12} />
                    {errors.length} erros — ver detalhes
                    {showErrors ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showErrors && (
                    <div className="mt-2 max-h-28 overflow-y-auto text-left bg-red-50 rounded-lg p-2 space-y-1">
                      {errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-700">
                          <span className="font-medium">{e.contact.email}</span>: {e.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button className="w-full bg-navy text-white hover:bg-navy/90" onClick={onClose}>
                Fechar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}