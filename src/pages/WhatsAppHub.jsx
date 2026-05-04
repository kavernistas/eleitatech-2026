import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Wifi, WifiOff, Loader2, QrCode, MessageSquare, User, Bot,
  AlertTriangle, Send, ChevronRight, Search, CheckCheck, Clock,
  PhoneCall, Zap, RefreshCw, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const HANDOVER_MSG = 'Olá! Sou o Marcos Eduardo. Vou assumir o atendimento pessoalmente para finalizarmos a sua regularização. 🤝';

// Fake QR Code SVG pattern
function QrCodeDisplay({ status }) {
  if (status === 'online') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
          <Wifi className="w-8 h-8 text-success" />
        </div>
        <p className="text-sm font-semibold text-success">WhatsApp Conectado</p>
        <p className="text-xs text-muted-foreground">+55 (11) 99999-0000 · Online</p>
      </div>
    );
  }
  if (status === 'connecting') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="relative">
          {/* Simulated QR Code grid */}
          <div className="w-40 h-40 bg-white border-2 border-border rounded-lg p-2 grid grid-cols-10 gap-px opacity-80">
            {Array.from({ length: 100 }).map((_, i) => {
              const corner = (r, c) => (r < 3 && c < 3) || (r < 3 && c > 6) || (r > 6 && c < 3);
              const row = Math.floor(i / 10);
              const col = i % 10;
              const isCorner = corner(row, col);
              const pseudo = (i * 7 + row * 3 + col * 5) % 100;
              return (
                <div
                  key={i}
                  className={`rounded-[1px] ${isCorner || pseudo < 45 ? 'bg-foreground' : 'bg-transparent'}`}
                />
              );
            })}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-navy animate-spin opacity-80" />
          </div>
        </div>
        <p className="text-sm font-semibold text-warning">Aguardando leitura do QR Code</p>
        <p className="text-xs text-muted-foreground text-center max-w-[200px]">
          Abra o WhatsApp → Aparelhos conectados → Conectar aparelho
        </p>
      </div>
    );
  }
  // disconnected
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
        <WifiOff className="w-8 h-8 text-destructive" />
      </div>
      <p className="text-sm font-semibold text-destructive">Desconectado</p>
      <p className="text-xs text-muted-foreground">Clique em "Conectar" para gerar o QR Code</p>
    </div>
  );
}

export default function WhatsAppHub() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected | connecting | online
  const [activeTab, setActiveTab] = useState('inbox'); // inbox | setup
  const [selectedContact, setSelectedContact] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [sendingHandover, setSendingHandover] = useState(false);
  const bottomRef = useRef(null);
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-wa'],
    queryFn: () => base44.entities.Contact.list('-updated_date', 100),
    refetchInterval: 10000,
  });

  // Contacts that need human attention or have conversation history
  const inboxContacts = contacts.filter(c =>
    c.status === 'atendimento_humano' || (c.whatsapp_conversation && c.whatsapp_conversation.length > 0)
  );

  const urgentContacts = inboxContacts.filter(c => c.status === 'atendimento_humano');

  const filteredInbox = inboxContacts.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.party_name?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedContact]);

  const simulateConnect = () => {
    setConnectionStatus('connecting');
    setTimeout(() => setConnectionStatus('online'), 4000);
  };

  const handleAssumirConversa = async () => {
    if (!selectedContact?.id) return;
    setSendingHandover(true);
    const handoverMsg = { role: 'human', content: HANDOVER_MSG, ts: new Date().toISOString() };
    const existing = selectedContact.whatsapp_conversation || [];
    const updated = [...existing, handoverMsg];
    await base44.entities.Contact.update(selectedContact.id, {
      status: 'contato_feito',
      whatsapp_conversation: updated,
    });
    setSelectedContact(prev => ({ ...prev, status: 'contato_feito', whatsapp_conversation: updated }));
    qc.invalidateQueries({ queryKey: ['contacts-wa'] });
    setSendingHandover(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedContact?.id) return;
    const humanMsg = { role: 'human', content: replyText.trim(), ts: new Date().toISOString() };
    const existing = selectedContact.whatsapp_conversation || [];
    const updated = [...existing, humanMsg];
    await base44.entities.Contact.update(selectedContact.id, { whatsapp_conversation: updated });
    setSelectedContact(prev => ({ ...prev, whatsapp_conversation: updated }));
    qc.invalidateQueries({ queryKey: ['contacts-wa'] });
    setReplyText('');
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } };

  const conversation = selectedContact?.whatsapp_conversation || [];

  const statusColor = { disconnected: 'text-destructive', connecting: 'text-warning', online: 'text-success' };
  const statusLabel = { disconnected: 'Desconectado', connecting: 'Conectando...', online: 'Online' };
  const statusDot = { disconnected: 'bg-destructive', connecting: 'bg-warning animate-pulse', online: 'bg-success' };

  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#25D366]/10 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#25D366]" />
          </div>
          <div>
            <h1 className="font-playfair font-bold text-lg text-foreground">Central WhatsApp</h1>
            <p className="text-xs text-muted-foreground">Inbox unificada · Atendimento Humano</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {urgentContacts.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-warning bg-warning/10 border border-warning/20 px-3 py-1.5 rounded-full animate-pulse">
              <AlertTriangle size={12} /> {urgentContacts.length} aguardando Marcos
            </span>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${statusDot[connectionStatus]}`} />
            <span className={`font-medium ${statusColor[connectionStatus]}`}>{statusLabel[connectionStatus]}</span>
          </div>
          <div className="flex border border-border rounded-lg overflow-hidden text-xs">
            <button onClick={() => setActiveTab('inbox')} className={`px-3 py-1.5 font-medium transition-colors ${activeTab === 'inbox' ? 'bg-navy text-white' : 'hover:bg-muted'}`}>
              Inbox {inboxContacts.length > 0 && <span className="ml-1 bg-white/20 px-1.5 rounded">{inboxContacts.length}</span>}
            </button>
            <button onClick={() => setActiveTab('setup')} className={`px-3 py-1.5 font-medium transition-colors ${activeTab === 'setup' ? 'bg-navy text-white' : 'hover:bg-muted'}`}>
              Conexão
            </button>
          </div>
        </div>
      </div>

      {/* Setup tab */}
      {activeTab === 'setup' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Connection card */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center gap-4">
              <h2 className="text-sm font-semibold text-foreground self-start">Instância WhatsApp</h2>
              <QrCodeDisplay status={connectionStatus} />
              <div className="flex gap-3">
                {connectionStatus === 'disconnected' && (
                  <Button onClick={simulateConnect} className="bg-[#25D366] hover:bg-[#1fb958] text-white gap-2">
                    <QrCode size={16} /> Conectar WhatsApp
                  </Button>
                )}
                {connectionStatus === 'connecting' && (
                  <Button variant="outline" onClick={() => setConnectionStatus('disconnected')} className="gap-2">
                    <RefreshCw size={16} /> Cancelar
                  </Button>
                )}
                {connectionStatus === 'online' && (
                  <Button variant="outline" onClick={() => setConnectionStatus('disconnected')} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
                    <WifiOff size={16} /> Desconectar
                  </Button>
                )}
              </div>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-navy">{inboxContacts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Conversas Ativas</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-warning">{urgentContacts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Aguardando Marcos</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-success">{contacts.filter(c => c.status === 'fechado').length}</p>
                <p className="text-xs text-muted-foreground mt-1">Fechados</p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Info size={15} className="text-blue-600" />
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Como funciona</p>
              </div>
              <ol className="space-y-2 text-xs text-blue-700 dark:text-blue-300 list-decimal list-inside">
                <li>A <strong>IA faz a triagem</strong> de todos os leads automaticamente.</li>
                <li>Quando detecta intenção de fechamento, <strong>alerta o Marcos</strong> no Dashboard.</li>
                <li>Marcos clica em <strong>"Assumir Conversa"</strong> e envia mensagem automática de handover.</li>
                <li>O histórico mostra em <strong>cores diferentes</strong> o que foi respondido pela IA vs pelo Marcos.</li>
                <li>Após o fechamento, o status muda para <strong>Fechado</strong> no Kanban.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Inbox tab */}
      {activeTab === 'inbox' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Contact list */}
          <div className={`${selectedContact ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-border bg-card/30`}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 h-8 text-sm" />
              </div>
            </div>

            {urgentContacts.length > 0 && (
              <div className="px-3 py-2 bg-warning/5 border-b border-warning/20">
                <p className="text-[10px] font-semibold text-warning uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle size={10} /> Atenção imediata
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {filteredInbox.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">As conversas da IA aparecerão aqui</p>
                </div>
              ) : filteredInbox.map(contact => {
                const msgs = contact.whatsapp_conversation || [];
                const lastMsg = msgs[msgs.length - 1];
                const isUrgent = contact.status === 'atendimento_humano';
                return (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`px-3 py-3 border-b border-border cursor-pointer transition-colors hover:bg-muted/40 ${selectedContact?.id === contact.id ? 'bg-primary/5' : ''} ${isUrgent ? 'border-l-2 border-l-warning' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isUrgent ? 'bg-warning/20 text-warning' : 'bg-navy/10 text-navy'}`}>
                        {(contact.name || contact.email || '?').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold truncate">{contact.name || contact.email}</p>
                          {lastMsg?.ts && (
                            <p className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                              {format(new Date(lastMsg.ts), 'HH:mm', { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{contact.party_name} · {contact.city}</p>
                        {lastMsg && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                            {lastMsg.role === 'human' ? <User size={9} className="text-navy" /> : <Bot size={9} />}
                            {lastMsg.content?.substring(0, 50)}...
                          </p>
                        )}
                      </div>
                      {isUrgent && <span className="w-2.5 h-2.5 bg-warning rounded-full flex-shrink-0 animate-pulse mt-1" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat area */}
          {!selectedContact ? (
            <div className="flex-1 hidden lg:flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare size={28} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">Selecione uma conversa</p>
                <p className="text-xs text-muted-foreground mt-1">{inboxContacts.length} conversas disponíveis</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* Messages */}
              <div className="flex-1 flex flex-col">
                {/* Chat header */}
                <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 flex-shrink-0">
                  <button onClick={() => setSelectedContact(null)} className="lg:hidden p-1.5 rounded hover:bg-muted">
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                  <div className="w-9 h-9 bg-navy/10 rounded-full flex items-center justify-center font-bold text-navy text-sm">
                    {(selectedContact.name || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{selectedContact.name || selectedContact.email}</p>
                    <p className="text-xs text-muted-foreground">{selectedContact.party_name} · {selectedContact.city}, {selectedContact.state}</p>
                  </div>
                  {selectedContact.status === 'atendimento_humano' && (
                    <Button
                      onClick={handleAssumirConversa}
                      disabled={sendingHandover}
                      size="sm"
                      className="bg-[#25D366] hover:bg-[#1fb958] text-white gap-2 text-xs"
                    >
                      {sendingHandover ? <Loader2 size={13} className="animate-spin" /> : <PhoneCall size={13} />}
                      Assumir Conversa
                    </Button>
                  )}
                  {selectedContact.status !== 'atendimento_humano' && (
                    <Badge variant="outline" className="text-xs text-success border-success/30">
                      <CheckCheck size={11} className="mr-1" /> Marcos ativo
                    </Badge>
                  )}
                </div>

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5] dark:bg-background/50">
                  {conversation.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda</p>
                    </div>
                  )}
                  {conversation.map((msg, i) => {
                    const isHuman = msg.role === 'human';
                    const isUser = msg.role === 'user';
                    const isSystem = msg.role === 'system';

                    if (isSystem) {
                      return (
                        <div key={i} className="flex justify-center">
                          <span className="bg-warning/10 border border-warning/30 text-warning text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5">
                            <AlertTriangle size={10} /> {msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={i} className={`flex ${isUser ? 'justify-end' : isHuman ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[75%] ${(isUser || isHuman) ? 'flex-row-reverse' : ''}`}>
                          {/* Avatar */}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isHuman ? 'bg-[#25D366]' : isUser ? 'bg-navy/20' : 'gradient-navy'
                          }`}>
                            {isHuman ? <User size={13} className="text-white" /> :
                              isUser ? <User size={13} className="text-navy" /> :
                              <Bot size={13} className="text-white" />}
                          </div>
                          {/* Bubble */}
                          <div>
                            {/* Sender label */}
                            <p className={`text-[10px] mb-0.5 ${(isUser || isHuman) ? 'text-right' : 'text-left'} text-muted-foreground`}>
                              {isHuman ? '👤 Marcos (humano)' : isUser ? '🏛️ Lead' : '🤖 IA Jurídica'}
                            </p>
                            <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                              isHuman
                                ? 'bg-[#25D366] text-white rounded-tr-sm'   // green - human
                                : isUser
                                ? 'bg-navy text-white rounded-tr-sm'          // navy - lead
                                : 'bg-white dark:bg-card border border-border text-foreground rounded-tl-sm'  // white - AI
                            }`}>
                              {msg.content}
                            </div>
                            {msg.ts && (
                              <p className={`text-[10px] text-muted-foreground mt-0.5 ${(isUser || isHuman) ? 'text-right' : 'text-left'}`}>
                                {format(new Date(msg.ts), 'HH:mm', { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Reply box */}
                <div className="border-t border-border bg-card p-3 flex gap-2 flex-shrink-0">
                  <Input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Responder como Marcos..."
                    className="flex-1 h-10 text-sm"
                  />
                  <Button onClick={handleSendReply} disabled={!replyText.trim()} className="bg-[#25D366] hover:bg-[#1fb958] text-white h-10 px-4">
                    <Send size={15} />
                  </Button>
                </div>

                {/* Legend */}
                <div className="px-4 pb-2 bg-card flex items-center gap-4 flex-wrap border-t border-border">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white border border-border inline-block" />IA Jurídica</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-navy inline-block" />Lead/Partido</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#25D366] inline-block" />Marcos (humano)</span>
                </div>
              </div>

              {/* Contact sidebar */}
              <div className="hidden xl:flex flex-col w-64 border-l border-border bg-card/30 overflow-y-auto">
                <div className="p-4 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do CRM</p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Partido</p>
                    <p className="text-sm font-semibold text-foreground">{selectedContact.party_name || '—'}</p>
                    {selectedContact.party_acronym && <p className="text-xs text-muted-foreground">{selectedContact.party_acronym}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Município</p>
                    <p className="text-sm text-foreground">{selectedContact.city}, {selectedContact.state}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Contato</p>
                    <p className="text-sm text-foreground">{selectedContact.email}</p>
                    {selectedContact.phone && <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>}
                  </div>
                  {selectedContact.tags?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Pendências</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedContact.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded font-medium">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedContact.ai_summary && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Resumo IA</p>
                      <p className="text-xs text-foreground leading-relaxed bg-muted rounded-lg p-2">{selectedContact.ai_summary}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Histórico de Envios</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">E-mails enviados</span><span className="font-medium">{selectedContact.emails_sent_count || 0}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Abertos</span><span className="font-medium text-success">{selectedContact.emails_opened_count || 0}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Cliques</span><span className="font-medium text-navy">{selectedContact.clicks_count || 0}</span></div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                      selectedContact.status === 'atendimento_humano' ? 'bg-warning/10 text-warning' :
                      selectedContact.status === 'fechado' ? 'bg-success/10 text-success' :
                      selectedContact.status === 'proposta_enviada' ? 'bg-blue-100 text-blue-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {selectedContact.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}