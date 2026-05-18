import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Wifi, WifiOff, Loader2, MessageSquare, User, Bot,
  AlertTriangle, Send, ChevronRight, Search, CheckCheck,
  PhoneCall, RefreshCw, Info, FileText, Zap, Plus, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const HANDOVER_MSG = 'Olá! Sou o Marcos Eduardo. Vou assumir o atendimento pessoalmente para finalizarmos a sua regularização. 🤝';

// ── Connection Status Display ────────────────────────────────────────────────
function ConnectionDisplay({ status, connectedPhone }) {
  if (status === 'online') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
          <Wifi className="w-8 h-8 text-success" />
        </div>
        <p className="text-sm font-semibold text-success">Evolution API Conectada</p>
        {connectedPhone && <p className="text-xs text-muted-foreground">+{connectedPhone} · Online</p>}
      </div>
    );
  }
  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="w-10 h-10 text-navy animate-spin" />
        <p className="text-sm font-semibold text-warning">Verificando conexão...</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
        <WifiOff className="w-8 h-8 text-destructive" />
      </div>
      <p className="text-sm font-semibold text-destructive">Não conectado à Evolution API</p>
      <p className="text-xs text-muted-foreground text-center max-w-[220px]">Verifique as configurações da API e clique em "Verificar Conexão"</p>
    </div>
  );
}

// ── Setup tab: configurações da instância ────────────────────────────────────
function SetupTab({ connectionStatus, connectedPhone, inboxContacts, urgentContacts, contacts, onCheck, isChecking }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Connection card */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center gap-4">
          <h2 className="text-sm font-semibold text-foreground self-start">Instância WhatsApp (Evolution API)</h2>
          <ConnectionDisplay status={connectionStatus} connectedPhone={connectedPhone} />
          <div className="flex gap-3">
            <Button onClick={onCheck} disabled={isChecking} className="bg-navy hover:bg-navy/90 text-white gap-2">
              {isChecking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Verificar Conexão
            </Button>
          </div>
        </div>

        {/* Stats */}
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

        {/* Webhook setup instructions */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Configuração do Webhook</p>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
            No painel da Evolution API, configure o webhook para receber mensagens:
          </p>
          <ol className="space-y-1 text-xs text-amber-700 dark:text-amber-300 list-decimal list-inside">
            <li>Acesse seu servidor Evolution API → Instâncias → Configurações</li>
            <li>No campo <strong>Webhook URL</strong>, insira a URL da função <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">whatsappWebhook</code></li>
            <li>Ative o evento <strong>messages.upsert</strong></li>
            <li>Salve e teste enviando uma mensagem para o número conectado</li>
          </ol>
        </div>

        {/* How it works */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} className="text-blue-600" />
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Como funciona o fluxo</p>
          </div>
          <ol className="space-y-2 text-xs text-blue-700 dark:text-blue-300 list-decimal list-inside">
            <li>Lead envia mensagem → <strong>Webhook recebe</strong> e identifica no CRM.</li>
            <li><strong>IA responde automaticamente</strong> com orientação jurídica.</li>
            <li>Se detectar intenção de fechar → muda para <strong>Atendimento Humano</strong> e alerta o Marcos.</li>
            <li>Marcos clica em <strong>"Assumir Conversa"</strong> → mensagem é enviada via WhatsApp real.</li>
            <li>Documentos recebidos são marcados com tag <strong>Documento_Recebido</strong>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ── New Conversation Modal ────────────────────────────────────────────────────
function NewConversationModal({ contacts, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const filtered = contacts.filter(c =>
    c.phone && (
      !q ||
      c.name?.toLowerCase().includes(q.toLowerCase()) ||
      c.party_name?.toLowerCase().includes(q.toLowerCase()) ||
      c.phone?.includes(q)
    )
  );
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <p className="font-semibold text-sm">Iniciar Nova Conversa</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
            <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, partido ou telefone..." className="pl-8 h-9 text-sm" />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {q ? 'Nenhum contato encontrado' : 'Nenhum contato com telefone cadastrado'}
            </div>
          ) : filtered.map(c => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); onClose(); }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
            >
              <div className="w-9 h-9 rounded-full bg-navy/10 text-navy flex items-center justify-center font-bold text-sm flex-shrink-0">
                {(c.name || c.email || '?').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name || c.email}</p>
                <p className="text-xs text-muted-foreground truncate">{c.party_name} · {c.phone}</p>
              </div>
              <Badge variant="outline" className="text-[10px] flex-shrink-0">
                {c.status?.replace(/_/g, ' ')}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function WhatsAppHub() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectedPhone, setConnectedPhone] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedContact, setSelectedContact] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const bottomRef = useRef(null);
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-wa'],
    queryFn: () => base44.entities.Contact.list('-updated_date', 200),
    refetchInterval: 3000,
  });

  // Real-time subscription: invalidate query whenever any Contact changes
  useEffect(() => {
    const unsub = base44.entities.Contact.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['contacts-wa'] });
    });
    return unsub;
  }, [qc]);

  const handleCheckConnection = async () => {
    setIsChecking(true);
    setConnectionStatus('checking');
    try {
      const res = await base44.functions.invoke('evolutionApi', { action: 'getStatus' });
      const d = res.data;
      // Evolution API v1/v2 compatibility: state may be nested or at root
      const state = d?.instance?.state || d?.state || d?.connectionStatus || d?.instance?.connectionStatus;
      const stateStr = (state || '').toString().toLowerCase();
      const isOpen = stateStr === 'open' || stateStr === 'connected' || stateStr === 'online';

      // Se recebemos qualquer resposta JSON válida com dados de instância, provavelmente está conectado
      const hasInstanceData = d?.instance || d?.ownerJid || d?.instance?.ownerJid;

      if (isOpen || (hasInstanceData && !d?.error)) {
        setConnectionStatus('online');
        const ownerJid = d?.instance?.ownerJid || d?.ownerJid;
        const phone = ownerJid?.replace('@s.whatsapp.net', '').replace(/\D/g, '');
        if (phone) setConnectedPhone(phone);
      } else if (d?.error) {
        setConnectionStatus('disconnected');
      } else {
        // Resposta sem state claro — consideramos como potencialmente conectado se não há erro
        setConnectionStatus('disconnected');
      }
    } catch {
      setConnectionStatus('disconnected');
    }
    setIsChecking(false);
  };

  // Auto-check connection status on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { handleCheckConnection(); }, []);

  const inboxContacts = contacts.filter(c =>
    c.status === 'atendimento_humano' || (c.whatsapp_conversation && c.whatsapp_conversation.length > 0)
  );
  const urgentContacts = inboxContacts.filter(c => c.status === 'atendimento_humano');
  const filteredInbox = inboxContacts.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.party_name?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedContact?.id, selectedContact?.whatsapp_conversation?.length]);

  // Keep selectedContact in sync with latest data from query
  useEffect(() => {
    if (selectedContact?.id) {
      const updated = contacts.find(c => c.id === selectedContact.id);
      if (updated) setSelectedContact(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts]);

  const handleAssumirConversa = async () => {
    if (!selectedContact?.id) return;
    setSendingMsg(true);
    const handoverMsg = { role: 'human', content: HANDOVER_MSG, ts: new Date().toISOString() };
    const updated = [...(selectedContact.whatsapp_conversation || []), handoverMsg];

    // Send real WhatsApp message if phone exists
    if (selectedContact.phone) {
      try {
        await base44.functions.invoke('evolutionApi', {
          action: 'sendMessage',
          payload: { phone: selectedContact.phone, text: HANDOVER_MSG }
        });
      } catch {}
    }

    await base44.entities.Contact.update(selectedContact.id, {
      status: 'contato_feito',
      whatsapp_conversation: updated,
    });
    setSelectedContact(prev => ({ ...prev, status: 'contato_feito', whatsapp_conversation: updated }));
    qc.invalidateQueries({ queryKey: ['contacts-wa'] });
    setSendingMsg(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedContact?.id) return;
    setSendingMsg(true);
    const text = replyText.trim();
    const humanMsg = { role: 'human', content: text, ts: new Date().toISOString() };
    const updated = [...(selectedContact.whatsapp_conversation || []), humanMsg];

    // Send real WhatsApp message
    if (selectedContact.phone) {
      try {
        await base44.functions.invoke('evolutionApi', {
          action: 'sendMessage',
          payload: { phone: selectedContact.phone, text }
        });
      } catch {}
    }

    await base44.entities.Contact.update(selectedContact.id, { whatsapp_conversation: updated });
    setSelectedContact(prev => ({ ...prev, whatsapp_conversation: updated }));
    qc.invalidateQueries({ queryKey: ['contacts-wa'] });
    setReplyText('');
    setSendingMsg(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); }
  };

  const conversation = selectedContact?.whatsapp_conversation || [];
  const statusColor = { disconnected: 'text-destructive', checking: 'text-warning', online: 'text-success' };
  const statusLabel = { disconnected: 'Desconectado', checking: 'Verificando...', online: 'Online' };
  const statusDot = { disconnected: 'bg-destructive', checking: 'bg-warning animate-pulse', online: 'bg-success animate-pulse' };

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
            <p className="text-xs text-muted-foreground">Evolution API · Inbox Unificada</p>
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
        <SetupTab
          connectionStatus={connectionStatus}
          connectedPhone={connectedPhone}
          inboxContacts={inboxContacts}
          urgentContacts={urgentContacts}
          contacts={contacts}
          onCheck={handleCheckConnection}
          isChecking={isChecking}
        />
      )}

      {/* Inbox tab */}
      {activeTab === 'inbox' && (
        <div className="flex-1 flex overflow-hidden">
          {/* New Conversation Modal */}
          {showNewConv && (
            <NewConversationModal
              contacts={contacts}
              onSelect={(c) => {
                setSelectedContact(c);
                // Add to inbox if not already there
                if (!c.whatsapp_conversation?.length) {
                  base44.entities.Contact.update(c.id, {
                    whatsapp_conversation: c.whatsapp_conversation || [],
                    status: c.status === 'novo' ? 'contato_feito' : c.status,
                  }).then(() => qc.invalidateQueries({ queryKey: ['contacts-wa'] }));
                }
              }}
              onClose={() => setShowNewConv(false)}
            />
          )}

          {/* Contact list */}
          <div className={`${selectedContact ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-border bg-card/30`}>
            <div className="p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 h-8 text-sm" />
              </div>
              <Button
                size="sm"
                onClick={() => setShowNewConv(true)}
                className="w-full h-8 text-xs bg-[#25D366] hover:bg-[#1fb958] text-white gap-1.5"
              >
                <Plus size={13} /> Nova Conversa
              </Button>
            </div>

            {urgentContacts.length > 0 && (
              <div className="px-3 py-2 bg-warning/5 border-b border-warning/20">
                <p className="text-[10px] font-semibold text-warning uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle size={10} /> Atenção imediata ({urgentContacts.length})
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {filteredInbox.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">Mensagens recebidas aparecerão aqui automaticamente</p>
                </div>
              ) : filteredInbox.map(contact => {
                const msgs = contact.whatsapp_conversation || [];
                const lastMsg = msgs[msgs.length - 1];
                const isUrgent = contact.status === 'atendimento_humano';
                const hasDoc = contact.tags?.includes('Documento_Recebido');
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
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            {hasDoc && <FileText size={10} className="text-blue-500" />}
                            {lastMsg?.ts && (
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(lastMsg.ts), 'HH:mm', { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{contact.party_name} · {contact.city}</p>
                        {lastMsg && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                            {lastMsg.role === 'human' ? <User size={9} className="text-[#25D366]" /> :
                              lastMsg.role === 'assistant' ? <Bot size={9} /> : <User size={9} className="text-navy" />}
                            {lastMsg.content?.substring(0, 50)}
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{selectedContact.name || selectedContact.email}</p>
                      {selectedContact.tags?.includes('Documento_Recebido') && (
                        <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300 px-1.5 py-0">
                          <FileText size={9} className="mr-1" /> Doc recebido
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedContact.party_name} · {selectedContact.city}, {selectedContact.state}
                      {selectedContact.phone && ` · ${selectedContact.phone}`}
                    </p>
                  </div>
                  {selectedContact.status === 'atendimento_humano' && (
                    <Button
                      onClick={handleAssumirConversa}
                      disabled={sendingMsg}
                      size="sm"
                      className="bg-[#25D366] hover:bg-[#1fb958] text-white gap-2 text-xs"
                    >
                      {sendingMsg ? <Loader2 size={13} className="animate-spin" /> : <PhoneCall size={13} />}
                      Assumir Conversa
                    </Button>
                  )}
                  {selectedContact.status !== 'atendimento_humano' && (
                    <Badge variant="outline" className="text-xs text-success border-success/30">
                      <CheckCheck size={11} className="mr-1" /> Marcos ativo
                    </Badge>
                  )}
                </div>

                {/* Messages */}
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
                      <div key={i} className={`flex ${(isUser || isHuman) ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[75%] ${(isUser || isHuman) ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isHuman ? 'bg-[#25D366]' : isUser ? 'bg-navy' : 'bg-muted border border-border'
                          }`}>
                            {isHuman ? <User size={13} className="text-white" /> :
                              isUser ? <User size={13} className="text-white" /> :
                              <Bot size={13} className="text-foreground" />}
                          </div>
                          <div>
                            <p className={`text-[10px] mb-0.5 ${(isUser || isHuman) ? 'text-right' : 'text-left'} text-muted-foreground`}>
                              {isHuman ? '👤 Marcos (humano)' : isUser ? '🏛️ Lead' : '🤖 IA Jurídica'}
                            </p>
                            <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                              isHuman
                                ? 'bg-[#25D366] text-white rounded-tr-sm'
                                : isUser
                                ? 'bg-navy text-white rounded-tr-sm'
                                : 'bg-white dark:bg-card border border-border text-foreground rounded-tl-sm'
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
                    placeholder={selectedContact.phone ? `Responder para ${selectedContact.phone}...` : 'Responder como Marcos...'}
                    className="flex-1 h-10 text-sm"
                    disabled={sendingMsg}
                  />
                  <Button onClick={handleSendReply} disabled={!replyText.trim() || sendingMsg} className="bg-[#25D366] hover:bg-[#1fb958] text-white h-10 px-4">
                    {sendingMsg ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </Button>
                </div>

                {/* Legend */}
                <div className="px-4 pb-2 pt-1 bg-card flex items-center gap-4 flex-wrap border-t border-border">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted border border-border inline-block" />IA Jurídica</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-navy inline-block" />Lead/Partido</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#25D366] inline-block" />Marcos (humano)</span>
                  {!selectedContact.phone && (
                    <span className="text-[10px] text-warning ml-auto">⚠ Sem telefone cadastrado — mensagens não serão enviadas via WhatsApp</span>
                  )}
                </div>
              </div>

              {/* CRM Sidebar */}
              <div className="hidden xl:flex flex-col w-64 border-l border-border bg-card/30 overflow-y-auto">
                <div className="p-4 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do CRM</p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Partido</p>
                    <p className="text-sm font-semibold">{selectedContact.party_name || '—'}</p>
                    {selectedContact.party_acronym && <p className="text-xs text-muted-foreground">{selectedContact.party_acronym}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Município</p>
                    <p className="text-sm">{selectedContact.city}, {selectedContact.state}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Contato</p>
                    <p className="text-sm">{selectedContact.email}</p>
                    {selectedContact.phone && <p className="text-xs text-muted-foreground font-mono">{selectedContact.phone}</p>}
                  </div>
                  {selectedContact.tags?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedContact.tags.map(tag => (
                          <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                            tag === 'Documento_Recebido' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-warning/10 text-warning border-warning/20'
                          }`}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedContact.ai_summary && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Resumo IA</p>
                      <p className="text-xs leading-relaxed bg-muted rounded-lg p-2">{selectedContact.ai_summary}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">E-mails</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Enviados</span><span className="font-medium">{selectedContact.emails_sent_count || 0}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Abertos</span><span className="font-medium text-success">{selectedContact.emails_opened_count || 0}</span></div>
                    </div>
                  </div>
                  <div className="pt-1">
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