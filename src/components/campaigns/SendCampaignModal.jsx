import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Users, CheckCircle2, AlertTriangle, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'contato_feito', label: 'Contato Feito', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'interessado', label: 'Interessado', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  { value: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-purple-50 text-purple-700 border-purple-300' },
  { value: 'fechado', label: 'Fechado', color: 'bg-green-50 text-green-700 border-green-300' },
  { value: 'atendimento_humano', label: 'Atendimento Humano', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  { value: 'inativo', label: 'Inativo', color: 'bg-red-50 text-red-700 border-red-300' },
];

const TAG_OPTIONS = ['Urgente', 'Pendência 2024', 'CNPJ', 'Contas 2025'];

export default function SendCampaignModal({ campaign, onClose }) {
  // null = todos os status; Set = status específicos selecionados
  const [statusFilter, setStatusFilter] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [ufFilter, setUfFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [partyFilter, setPartyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(null); // null = todos filtrados
  const [step, setStep] = useState('config');
  const [delaySeconds, setDelaySeconds] = useState(30);
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-send'],
    queryFn: () => base44.entities.Contact.list('-created_date', 2000),
  });

  const updateCampaignMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.update(campaign.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  // Derived option lists
  const ufs = useMemo(() => {
    const set = new Set(contacts.map(c => c.state).filter(Boolean));
    return [...set].sort();
  }, [contacts]);

  const cities = useMemo(() => {
    const set = new Set(
      contacts
        .filter(c => ufFilter === 'all' || c.state === ufFilter)
        .map(c => c.city)
        .filter(Boolean)
    );
    return [...set].sort();
  }, [contacts, ufFilter]);

  const parties = useMemo(() => {
    const set = new Set(contacts.map(c => c.party_acronym || c.party_name).filter(Boolean));
    return [...set].sort();
  }, [contacts]);

  // Filtered contacts
  const filtered = useMemo(() => contacts.filter(c => {
    if (!c.email) return false;
    if (c.email_valid === false) return false;
    if (statusFilter && statusFilter.size > 0 && !statusFilter.has(c.status || 'novo')) return false;
    if (tagFilter && !(c.tags || []).includes(tagFilter)) return false;
    if (ufFilter !== 'all' && c.state !== ufFilter) return false;
    if (cityFilter !== 'all' && c.city !== cityFilter) return false;
    if (partyFilter !== 'all') {
      const cp = c.party_acronym || c.party_name || '';
      if (cp !== partyFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const haystack = [c.name, c.email, c.party_name, c.party_acronym, c.city].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }), [contacts, statusFilter, tagFilter, ufFilter, cityFilter, partyFilter, search]);

  const recipients = selectedIds ? filtered.filter(c => selectedIds.has(c.id)) : filtered;

  const toggleSelect = (id) => {
    if (!selectedIds) {
      // First manual selection: start from all filtered
      const newSet = new Set(filtered.map(c => c.id));
      newSet.delete(id);
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet.size === filtered.length ? null : newSet);
    }
  };

  const isSelected = (id) => selectedIds ? selectedIds.has(id) : true;

  const selectAll = () => setSelectedIds(null);
  const clearAll = () => setSelectedIds(new Set());

  const resetFilters = () => {
    setStatusFilter(null); setTagFilter(null);
    setUfFilter('all'); setCityFilter('all');
    setPartyFilter('all'); setSearch('');
    setSelectedIds(null);
  };

  const [sentCount, setSentCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState(null);

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const handleSend = async () => {
    setStep('sending');
    setSentCount(0);
    setErrorCount(0);
    setLastError(null);

    let sent = 0;
    let errors = 0;
    for (const contact of recipients) {
      try {
        const res = await base44.functions.invoke('sendProspectEmail', {
          contact,
          subject: campaign.subject_a || campaign.name,
          html_body: campaign.html_body,
        });
        // Se a função retornou erro no body mesmo com status 200
        if (res?.data?.error) {
          errors++;
          setErrorCount(errors);
          setLastError(res.data.error);
          // Se todos os 3 primeiros falharem, aborta para não continuar em loop
          if (errors >= 3 && sent === 0) {
            setStep('error');
            return;
          }
        } else {
          sent++;
          setSentCount(sent);
        }
        if (sent + errors < recipients.length && delaySeconds > 0) {
          await sleep(delaySeconds * 1000);
        }
      } catch (err) {
        errors++;
        setErrorCount(errors);
        const msg = err?.response?.data?.error || err.message;
        setLastError(msg);
        console.error('Erro ao enviar para', contact.email, msg);
        // Aborta se os 3 primeiros já falharam (evita loop longo inútil)
        if (errors >= 3 && sent === 0) {
          setStep('error');
          return;
        }
      }
    }

    await updateCampaignMutation.mutateAsync({
      status: 'enviado',
      total_sent: sent,
      total_opened: 0,
      total_clicked: 0,
      sent_at: new Date().toISOString(),
    });
    setStep('done');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-playfair">Enviar Campanha</DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-4 py-2">
            {/* Campaign info */}
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Campanha selecionada</p>
              <p className="text-sm font-semibold">{campaign.name}</p>
              <p className="text-xs text-muted-foreground truncate">{campaign.subject_a}</p>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider">Segmentação</p>
                <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-navy flex items-center gap-1">
                  <X size={11} /> Limpar filtros
                </button>
              </div>

              {/* Status CRM multi-select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground">Status CRM</p>
                  <div className="flex gap-2">
                    <button onClick={() => setStatusFilter(null)} className="text-[11px] text-navy hover:underline">Todos</button>
                    <span className="text-muted-foreground text-[11px]">·</span>
                    <button onClick={() => setStatusFilter(new Set())} className="text-[11px] text-muted-foreground hover:text-destructive">Nenhum</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(opt => {
                    const active = statusFilter === null || statusFilter.has(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          if (statusFilter === null) {
                            // Desmarcar este: criar set com todos exceto este
                            const s = new Set(STATUS_OPTIONS.map(o => o.value));
                            s.delete(opt.value);
                            setStatusFilter(s);
                          } else {
                            const s = new Set(statusFilter);
                            if (s.has(opt.value)) s.delete(opt.value);
                            else s.add(opt.value);
                            setStatusFilter(s.size === STATUS_OPTIONS.length ? null : s);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          active
                            ? opt.color + ' font-medium'
                            : 'bg-white text-muted-foreground border-border opacity-40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {statusFilter && statusFilter.size > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {statusFilter.size} status selecionado{statusFilter.size > 1 ? 's' : ''}
                  </p>
                )}
                {statusFilter && statusFilter.size === 0 && (
                  <p className="text-[11px] text-destructive mt-1">Nenhum status selecionado — nenhum contato será incluído</p>
                )}
              </div>

              {/* Row: UF + Cidade */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">UF</p>
                  <Select value={ufFilter} onValueChange={v => { setUfFilter(v); setCityFilter('all'); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos os estados</SelectItem>
                      {ufs.map(uf => <SelectItem key={uf} value={uf} className="text-xs">{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cidade</p>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todas as cidades</SelectItem>
                      {cities.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row: Partido */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Partido</p>
                  <Select value={partyFilter} onValueChange={setPartyFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos os partidos</SelectItem>
                      {parties.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tag</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setTagFilter(null)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!tagFilter ? 'bg-navy text-white border-navy' : 'border-border text-muted-foreground hover:border-navy hover:text-navy'}`}>
                    Todas
                  </button>
                  {TAG_OPTIONS.map(tag => (
                    <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${tagFilter === tag ? 'bg-navy text-white border-navy' : 'border-border text-muted-foreground hover:border-navy hover:text-navy'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome, e-mail, partido..."
                  className="h-8 text-xs pl-8"
                />
              </div>
            </div>

            {/* Contact list */}
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-muted px-3 py-2">
                <span className="text-xs font-medium text-foreground">
                  {filtered.length} contatos filtrados · {recipients.length} selecionados
                </span>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-navy hover:underline">Selecionar todos</button>
                  <span className="text-muted-foreground">·</span>
                  <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-destructive">Limpar</button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border">
                {filtered.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum contato encontrado com esses filtros
                  </div>
                ) : (
                  filtered.map(c => (
                    <div key={c.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleSelect(c.id)}>
                      <Checkbox checked={isSelected(c.id)} onCheckedChange={() => toggleSelect(c.id)} className="h-3.5 w-3.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.name || c.email}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs text-muted-foreground truncate">{c.email} {c.party_acronym ? `· ${c.party_acronym}` : ''} {c.state ? `· ${c.state}` : ''}</p>
                          {c.status && (() => { const opt = STATUS_OPTIONS.find(o => o.value === c.status); return opt ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${opt.color}`}>{opt.label}</span> : null; })()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {recipients.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-warning bg-warning/5 border border-warning/20 rounded-lg p-2">
                <AlertTriangle size={13} /> Nenhum destinatário selecionado
              </div>
            )}

            {/* Delay entre envios */}
            <div className="bg-muted/60 border border-border rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-foreground">⏱ Intervalo entre envios</p>
              <p className="text-[11px] text-muted-foreground">Aguardar entre cada e-mail para evitar bloqueio por spam.</p>
              <p className="text-[11px] text-warning font-medium">⚠ Gmail limita ~100 e-mails/dia. Use intervalo mínimo de 30s para evitar bloqueio.</p>
              <div className="flex gap-2 flex-wrap pt-0.5">
                {[0, 3, 5, 10, 15, 30].map(s => (
                  <button
                    key={s}
                    onClick={() => setDelaySeconds(s)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      delaySeconds === s
                        ? 'bg-navy text-white border-navy'
                        : 'border-border text-muted-foreground hover:border-navy hover:text-navy'
                    }`}
                  >
                    {s === 0 ? 'Sem delay' : `${s}s`}
                  </button>
                ))}
              </div>
              {recipients.length > 0 && delaySeconds > 0 && (
                <p className="text-[11px] text-muted-foreground pt-0.5">
                  Tempo estimado: ~{Math.ceil((recipients.length * delaySeconds) / 60)} min para {recipients.length} e-mails
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button onClick={() => setStep('confirm')} disabled={recipients.length === 0} className="flex-1 bg-navy text-white">
                Revisar Envio ({recipients.length})
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 py-2">
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 text-sm space-y-2">
              <p className="font-semibold">Confirme o envio:</p>
              <div className="space-y-1 text-muted-foreground text-xs">
                <div className="flex justify-between"><span>Campanha:</span><span className="font-medium text-foreground">{campaign.name}</span></div>
                <div className="flex justify-between"><span>Assunto:</span><span className="font-medium text-foreground truncate max-w-[200px]">{campaign.subject_a}</span></div>
                <div className="flex justify-between"><span>Status CRM:</span><span className="font-medium text-foreground">{statusFilter === null ? 'Todos' : statusFilter.size === 0 ? 'Nenhum' : [...statusFilter].map(s => STATUS_OPTIONS.find(o => o.value === s)?.label).join(', ')}</span></div>
                <div className="flex justify-between"><span>UF:</span><span className="font-medium text-foreground">{ufFilter === 'all' ? 'Todos' : ufFilter}</span></div>
                <div className="flex justify-between"><span>Cidade:</span><span className="font-medium text-foreground">{cityFilter === 'all' ? 'Todas' : cityFilter}</span></div>
                <div className="flex justify-between"><span>Partido:</span><span className="font-medium text-foreground">{partyFilter === 'all' ? 'Todos' : partyFilter}</span></div>
                <div className="flex justify-between"><span>Destinatários:</span><span className="font-bold text-navy">{recipients.length.toLocaleString('pt-BR')}</span></div>
                <div className="flex justify-between"><span>Intervalo:</span><span className="font-medium text-foreground">{delaySeconds === 0 ? 'Sem delay' : `${delaySeconds}s entre e-mails`}</span></div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('config')} className="flex-1">Voltar</Button>
              <Button onClick={handleSend} className="flex-1 bg-navy text-white">
                <Send size={13} className="mr-1.5" /> Confirmar Envio
              </Button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-navy/10 rounded-full flex items-center justify-center">
              <span className="w-7 h-7 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Enviando campanha...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {sentCount} de {recipients.length} e-mails enviados
              </p>
              {errorCount > 0 && (
                <p className="text-xs text-destructive mt-0.5">{errorCount} erro(s) até agora</p>
              )}
              {delaySeconds > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">Intervalo de {delaySeconds}s entre envios</p>
              )}
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle size={28} className="text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-semibold text-destructive">Falha no envio</p>
              <p className="text-sm text-muted-foreground">Os primeiros envios falharam. Verifique as configurações do TurboSMTP.</p>
              {lastError && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-2 text-xs text-destructive font-mono max-w-sm break-all">
                  {lastError.includes('nocredit')
                    ? '⚠ Conta TurboSMTP sem créditos. Recarregue em pro.turbo-smtp.com.'
                    : lastError}
                </div>
              )}
            </div>
            <Button onClick={() => setStep('config')} variant="outline">Voltar</Button>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 size={28} className="text-success" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Campanha enviada!</p>
              <p className="text-sm text-muted-foreground mt-1">{recipients.length.toLocaleString('pt-BR')} e-mails enviados com sucesso.</p>
            </div>
            <Button onClick={onClose} className="bg-navy text-white px-8">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}