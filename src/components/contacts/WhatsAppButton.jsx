import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronDown, Send, Bot, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function WhatsAppButton({ contact }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // 'success' | 'error'
  const dropRef = useRef(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateContact = useMutation({
    mutationFn: (data) => base44.entities.Contact.update(contact.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const handleSendTemplate = async () => {
    setOpen(false);
    if (!contact.phone) {
      setResult('no_phone');
      setTimeout(() => setResult(null), 3000);
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const party = contact.party_acronym || contact.party_name || 'seu partido';
      const text = `Olá! Aqui é o Marcos Eduardo. Notei que o diretório do ${party} ainda possui pendências para 2026. Podemos regularizar isso hoje?`;

      await base44.functions.invoke('evolutionApi', {
        action: 'sendMessage',
        payload: { phone: contact.phone, text },
      });

      // CRM update: notes timeline + score
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timelineEntry = `[WhatsApp] Template de Regularização enviado em ${dateStr}`;
      const existingNotes = contact.notes ? `${contact.notes}\n${timelineEntry}` : timelineEntry;
      const newScore = (contact.emails_sent_count || 0); // reuse field as proxy — update whatsapp count
      
      await updateContact.mutateAsync({
        notes: existingNotes,
        status: contact.status === 'novo' ? 'contato_feito' : contact.status,
        last_email_sent: now.toISOString(), // track last contact date
        emails_sent_count: (contact.emails_sent_count || 0) + 1,
        tags: [...new Set([...(contact.tags || []), 'WhatsApp Enviado'])],
      });

      setResult('success');
    } catch (e) {
      setResult('error');
    } finally {
      setSending(false);
      setTimeout(() => setResult(null), 4000);
    }
  };

  const handleOpenChat = () => {
    setOpen(false);
    navigate('/whatsapp');
  };

  return (
    <div className="relative" ref={dropRef}>
      {/* Main button */}
      <button
        onClick={() => !sending && setOpen(o => !o)}
        disabled={sending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-60"
        style={{ background: sending ? '#4CAF50aa' : 'linear-gradient(135deg,#25D366,#128C7E)' }}
      >
        {sending
          ? <Loader2 size={13} className="animate-spin" />
          : <MessageCircle size={13} />
        }
        {sending ? 'Enviando...' : 'WhatsApp'}
        {!sending && <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {/* Feedback badge */}
      {result === 'success' && (
        <div className="absolute top-full mt-1 right-0 flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[11px] px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow">
          <CheckCircle size={11} /> Mensagem enviada!
        </div>
      )}
      {result === 'error' && (
        <div className="absolute top-full mt-1 right-0 flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-[11px] px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow">
          <AlertCircle size={11} /> Erro ao enviar
        </div>
      )}
      {result === 'no_phone' && (
        <div className="absolute top-full mt-1 right-0 flex items-center gap-1 bg-yellow-50 border border-yellow-200 text-yellow-700 text-[11px] px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow">
          <AlertCircle size={11} /> Sem telefone cadastrado
        </div>
      )}

      {/* Dropdown menu */}
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-border rounded-xl shadow-xl z-20 w-56 overflow-hidden">
          <button
            onClick={handleSendTemplate}
            className="w-full flex items-start gap-2.5 px-3.5 py-3 text-left hover:bg-green-50 transition-colors border-b border-border"
          >
            <Send size={14} className="text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">Enviar Template de Regularização</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Disparo automático com mensagem jurídica</p>
            </div>
          </button>
          <button
            onClick={handleOpenChat}
            className="w-full flex items-start gap-2.5 px-3.5 py-3 text-left hover:bg-blue-50 transition-colors"
          >
            <Bot size={14} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">Abrir Conversa Direta</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Navegar para o hub de WhatsApp/IA</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}