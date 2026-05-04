import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  MessageSquare, Send, Bot, User, AlertTriangle,
  Phone, ChevronRight, Search, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const systemPrompt = `Você é uma consultora jurídica especializada do escritório do Dr. Marcos, 
especializado em direito eleitoral e partidário para as eleições brasileiras de 2026.

Você ajuda partidos políticos com:
- Regularização de CNPJ partidário junto à Receita Federal
- Prestação de contas eleitorais (período 2025)
- Compliance eleitoral e prazos junto ao TSE
- Cadastro e regularização de diretórios municipais
- Lei das Eleições (Lei 9.504/97) e legislação atualizada

REGRAS IMPORTANTES:
1. A partir da 3ª mensagem do contato na conversa, você DEVE incluir o link de orçamento personalizado no final da resposta: "📋 Acesse nosso orçamento personalizado: https://escritoriojuridico.adv.br/orcamento"
2. Se o contato mencionar qualquer arquivo, extrato, documento, comprovante ou "enviei", responda reconhecendo o recebimento e informe que o Dr. Marcos irá analisar o extrato de adimplência em até 2 horas úteis. Inclua [HUMANO_NECESSÁRIO] neste caso.
3. Ao detectar intenção de fechamento, urgência, dúvida complexa ou pedido de preço, inclua no final da resposta: [HUMANO_NECESSÁRIO]
4. Tom: profissional, confiante, empático. Seja conciso e direto. Cite prazos quando relevante.
5. Priorize sempre converter o interesse em agendamento ou orçamento formal.`;

export default function AIAgent() {
  const [selectedContact, setSelectedContact] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou a assistente virtual do escritório jurídico do Dr. Marcos. Como posso ajudá-lo hoje com as pendências eleitorais de 2026?' }
  ]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-ai'],
    queryFn: () => base44.entities.Contact.list('-created_date', 100),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const filteredContacts = contacts.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.party_name?.toLowerCase().includes(search.toLowerCase())
  );

  const selectContact = (contact) => {
    setSelectedContact(contact);
    const history = contact.whatsapp_conversation || [];
    if (history.length > 0) {
      setMessages(history);
    } else {
      setMessages([{ role: 'assistant', content: `Olá${contact.name ? `, ${contact.name.split(' ')[0]}` : ''}! Sou a consultora jurídica do escritório do Dr. Marcos. Posso ajudá-lo com as pendências do ${contact.party_name || 'seu partido'} para as eleições 2026?` }]);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;
    const userMsg = { role: 'user', content: message, ts: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setMessage('');
    setLoading(true);

    const history = newMessages.map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n');

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nHistórico da conversa:\n${history}\n\nResponda como assistente:`,
    });

    const needsHuman = response.includes('[HUMANO_NECESSÁRIO]');
    const cleanResponse = response.replace('[HUMANO_NECESSÁRIO]', '').trim();
    const assistantMsg = { role: 'assistant', content: cleanResponse, ts: new Date().toISOString() };
    const updated = [...newMessages, assistantMsg];
    setMessages(updated);

    if (selectedContact?.id) {
      const updates = { whatsapp_conversation: updated };
      if (needsHuman) updates.status = 'atendimento_humano';
      await base44.entities.Contact.update(selectedContact.id, updates);
      qc.invalidateQueries({ queryKey: ['contacts-ai'] });
    }

    if (needsHuman) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: '⚠️ Intenção de fechamento detectada! Marcos foi notificado para assumir o atendimento.'
      }]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const QUICK_REPLIES = [
    'Quais são os prazos para regularização do CNPJ?',
    'Como está a situação das contas 2025?',
    'Preciso falar com um especialista humano',
    'Quais documentos são necessários?',
    'Qual o valor do serviço?',
  ];

  const handleAssumirAtendimento = async () => {
    if (!selectedContact?.id) return;
    const handoverMsg = {
      role: 'human',
      content: 'Olá! Sou o Marcos Eduardo. Vou assumir o atendimento pessoalmente para finalizarmos a sua regularização. 🤝',
      ts: new Date().toISOString()
    };
    const updated = [...messages, handoverMsg];
    await base44.entities.Contact.update(selectedContact.id, {
      status: 'contato_feito',
      whatsapp_conversation: updated,
    });
    qc.invalidateQueries({ queryKey: ['contacts-ai'] });
    setSelectedContact(prev => ({ ...prev, status: 'contato_feito' }));
    setMessages(updated);
  };

  return (
    <div className="h-full flex animate-fade-in overflow-hidden">
      {/* Contact list */}
      <div className={`${selectedContact ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-72 border-r border-border bg-card/50`}>
        <div className="p-4 border-b border-border">
          <h2 className="font-playfair font-bold text-lg text-foreground mb-3">Agente IA</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contato..." className="pl-8 h-8 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Generic chat */}
          <div
            onClick={() => { setSelectedContact(null); setMessages([{ role: 'assistant', content: 'Olá! Sou a assistente jurídica do escritório. Como posso ajudar hoje?' }]); }}
            className="px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/50 flex items-center gap-3"
          >
            <div className="w-8 h-8 gradient-navy rounded-lg flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Chat Livre</p>
              <p className="text-xs text-muted-foreground">Conversa genérica</p>
            </div>
          </div>
          {filteredContacts.map(contact => (
            <div
              key={contact.id}
              onClick={() => selectContact(contact)}
              className={`px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/50 flex items-center gap-3 ${selectedContact?.id === contact.id ? 'bg-primary/5' : ''}`}
            >
              <div className="w-8 h-8 bg-navy/10 text-navy rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                {(contact.name || contact.email || '?').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{contact.name || contact.email}</p>
                <p className="text-xs text-muted-foreground truncate">{contact.party_name || 'Sem partido'}</p>
              </div>
              {contact.status === 'atendimento_humano' && (
                <span className="w-2 h-2 bg-warning rounded-full flex-shrink-0 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Chat header */}
        <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-3">
          {selectedContact && (
            <button onClick={() => setSelectedContact(null)} className="lg:hidden p-1.5 rounded hover:bg-muted">
              <ChevronRight size={16} className="rotate-180" />
            </button>
          )}
          <div className="w-8 h-8 gradient-navy rounded-lg flex items-center justify-center">
            <Bot size={14} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {selectedContact ? (selectedContact.name || selectedContact.email) : 'Consultora Jurídica IA'}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedContact ? selectedContact.party_name : 'Especialista em Direito Eleitoral 2026'}
            </p>
          </div>
          {selectedContact?.status === 'atendimento_humano' && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-2.5 py-1 rounded-full font-medium">
                <AlertTriangle size={11} /> Requer Humano
              </span>
              <button
                onClick={handleAssumirAtendimento}
                className="text-xs bg-navy text-white px-3 py-1 rounded-full font-medium hover:bg-navy/90 transition-colors"
              >
                Assumir
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
              {msg.role === 'system' ? (
                <div className="bg-warning/10 border border-warning/30 text-warning text-xs px-4 py-2 rounded-full font-medium">
                  {msg.content}
                </div>
              ) : (
                <div className={`flex gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-navy/10' : 'gradient-navy'}`}>
                    {msg.role === 'user' ? <User size={13} className="text-navy" /> : <Bot size={13} className="text-white" />}
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-navy text-white rounded-tr-sm'
                      : 'bg-card border border-border text-foreground rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-lg gradient-navy flex items-center justify-center">
                <Bot size={13} className="text-white" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card">
          {/* Quick replies */}
          {!loading && messages.length <= 2 && (
            <div className="px-4 pt-3 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map(q => (
                <button
                  key={q}
                  onClick={() => { setMessage(q); }}
                  className="text-[11px] px-2.5 py-1 bg-muted hover:bg-navy hover:text-white border border-border rounded-full text-muted-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 p-4">
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              className="flex-1 h-10 text-sm"
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={!message.trim() || loading} className="bg-navy text-white h-10 px-4">
              <Send size={15} />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground pb-3 text-center">
            IA treinada em legislação eleitoral brasileira · Transição automática para Marcos quando necessário
          </p>
        </div>
      </div>
    </div>
  );
}