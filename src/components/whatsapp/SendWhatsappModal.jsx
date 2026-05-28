import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Search, X, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'contato_feito', label: 'Contato Feito', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'interessado', label: 'Interessado', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  { value: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-purple-50 text-purple-700 border-purple-300' },
  { value: 'fechado', label: 'Fechado', color: 'bg-green-50 text-green-700 border-green-300' },
  { value: 'atendimento_humano', label: 'Atend. Humano', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  { value: 'inativo', label: 'Inativo', color: 'bg-red-50 text-red-700 border-red-300' },
];

export default function SendWhatsappModal({ campaign, onClose }) {
  const [statusFilter, setStatusFilter] = useState(null);
  const [ufFilter, setUfFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [partyFilter, setPartyFilter] = useState('all');
  const [mayorPartyFilter, setMayorPartyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(null);
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [step, setStep] = useState('config');
  const [sentCount, setSentCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-whatsapp-send'],
    queryFn: async () => {
      const pageSize = 500;
      let all = [];
      let page = 0;
      while (true) {
        const batch = await base44.entities.Contact.list('-created_date', pageSize, page * pageSize);
        all = all.concat(batch);
        if (batch.length < pageSize) break;
        page++;
      }
      return all.filter(c => c.phone);
    },
  });

  const { data: mayors = [] } = useQuery({
    queryKey: ['elected-mayors'],
    queryFn: () => base44.entities.ElectedMayor.list('city', 500),
  });

  // Mapa: cidade (uppercase) -> partido do prefeito
  const mayorPartyByCity = useMemo(() => {
    const map = {};
    mayors.forEach(m => {
      if (m.city) map[m.city.toUpperCase()] = m.party;
    });
    return map;
  }, [mayors]);

  const mayorParties = useMemo(() => {
    const partiesSet = new Set(mayors.map(m => m.party).filter(Boolean));
    return [...partiesSet].sort();
  }, [mayors]);

  const ufs = useMemo(() => [...new Set(contacts.map(c => c.state).filter(Boolean))].sort(), [contacts]);
  const cities = useMemo(() => {
    return [...new Set(contacts.filter(c => ufFilter === 'all' || c.state === ufFilter).map(c => c.city).filter(Boolean))].sort();
  }, [contacts, ufFilter]);
  const parties = useMemo(() => [...new Set(contacts.map(c => c.party_acronym || c.party_name).filter(Boolean))].sort(), [contacts]);

  const filtered = useMemo(() => contacts.filter(c => {
    if (!c.phone) return false;
    if (statusFilter && statusFilter.size > 0 && !statusFilter.has(c.status || 'novo')) return false;
    if (ufFilter !== 'all' && c.state !== ufFilter) return false;
    if (cityFilter !== 'all' && c.city !== cityFilter) return false;
    if (partyFilter !== 'all') {
      const cp = c.party_acronym || c.party_name || '';
      if (cp !== partyFilter) return false;
    }
    if (mayorPartyFilter !== 'all') {
      const cityKey = (c.city || '').toUpperCase();
      const mayorParty = mayorPartyByCity[cityKey];
      if (mayorParty !== mayorPartyFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (![c.name, c.phone, c.party_name, c.party_acronym, c.city].join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [contacts, statusFilter, ufFilter, cityFilter, partyFilter, mayorPartyFilter, mayorPartyByCity, search]);

  const recipients = selectedIds ? filtered.filter(c => selectedIds.has(c.id)) : filtered;

  const toggleSelect = (id) => {
    if (!selectedIds) {
      const newSet = new Set(filtered.map(c => c.id));
      newSet.delete(id);
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setSelectedIds(newSet.size === filtered.length ? null : newSet);
    }
  };

  const handleSend = async () => {
    setStep('sending');
    setSentCount(0);
    setErrorCount(0);
    setLastError(null);

    const BATCH = 20;
    let sent = 0;
    let errors = 0;

    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      try {
        const res = await base44.functions.invoke('sendWhatsappCampaign', {
          campaign_id: campaign.id,
          contacts: batch,
        });
        sent += res?.data?.sent || 0;
        errors += res?.data?.errors || 0;
        setSentCount(sent);
        setErrorCount(errors);

        if (res?.data?.error) {
          setLastError(res.data.error);
          setStep('error');
          return;
        }
      } catch (err) {
        const msg = err?.response?.data?.error || err.message;
        setLastError(msg);
        setStep('error');
        return;
      }
    }

    setStep('done');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-playfair flex items-center gap-2">
            <span className="text-green-600">💬</span> Enviar Campanha WhatsApp
          </DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-4 py-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Campanha</p>
              <p className="text-sm font-semibold">{campaign.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{campaign.message_template}</p>
            </div>

            {/* Filtros */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider">Segmentação</p>
                <button onClick={() => { setStatusFilter(null); setUfFilter('all'); setCityFilter('all'); setPartyFilter('all'); setMayorPartyFilter('all'); setSearch(''); setSelectedIds(null); }}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                  <X size={11} /> Limpar
                </button>
              </div>

              {/* Status CRM */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground">Status CRM</p>
                  <button onClick={() => setStatusFilter(null)} className="text-[11px] text-navy hover:underline">Todos</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(opt => {
                    const active = statusFilter === null || statusFilter.has(opt.value);
                    return (
                      <button key={opt.value}
                        onClick={() => {
                          if (statusFilter === null) {
                            const s = new Set(STATUS_OPTIONS.map(o => o.value)); s.delete(opt.value); setStatusFilter(s);
                          } else {
                            const s = new Set(statusFilter);
                            if (s.has(opt.value)) s.delete(opt.value); else s.add(opt.value);
                            setStatusFilter(s.size === STATUS_OPTIONS.length ? null : s);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${active ? opt.color + ' font-medium' : 'bg-white text-muted-foreground border-border opacity-40'}`}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtro por partido do prefeito eleito 2024 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-800">🏛 Prefeito Eleito 2024 (cidade do contato)</p>
                <Select value={mayorPartyFilter} onValueChange={setMayorPartyFilter}>
                  <SelectTrigger className="h-8 text-xs border-amber-300">
                    <SelectValue placeholder="Filtrar pelo partido do prefeito" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos os partidos</SelectItem>
                    {mayorParties.map(p => (
                      <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mayorPartyFilter !== 'all' && (
                  <p className="text-[11px] text-amber-700">
                    Mostrando contatos cujas cidades têm prefeito do <strong>{mayorPartyFilter}</strong>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">UF</p>
                  <Select value={ufFilter} onValueChange={v => { setUfFilter(v); setCityFilter('all'); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos</SelectItem>
                      {ufs.map(uf => <SelectItem key={uf} value={uf} className="text-xs">{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cidade</p>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todas</SelectItem>
                      {cities.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Partido</p>
                  <Select value={partyFilter} onValueChange={setPartyFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos</SelectItem>
                      {parties.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome, telefone, partido..." className="h-8 text-xs pl-8" />
              </div>
            </div>

            {/* Lista */}
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-muted px-3 py-2">
                <span className="text-xs font-medium">
                  <Users size={12} className="inline mr-1" />
                  {filtered.length} com WhatsApp · {recipients.length} selecionados
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedIds(null)} className="text-xs text-navy hover:underline">Todos</button>
                  <span className="text-muted-foreground">·</span>
                  <button onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground hover:text-destructive">Limpar</button>
                </div>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-border">
                {filtered.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">Nenhum contato com telefone encontrado</div>
                ) : filtered.map(c => (
                  <div key={c.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer" onClick={() => toggleSelect(c.id)}>
                    <Checkbox checked={selectedIds ? selectedIds.has(c.id) : true} onCheckedChange={() => toggleSelect(c.id)} className="h-3.5 w-3.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{c.name || c.phone}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.phone}
                        {c.party_acronym ? ` · ${c.party_acronym}` : ''}
                        {c.city ? ` · ${c.city}` : ''}
                        {c.state ? `/${c.state}` : ''}
                        {mayorPartyByCity[(c.city || '').toUpperCase()] ? (
                          <span className="ml-1 text-amber-700 font-medium">
                            🏛 {mayorPartyByCity[(c.city || '').toUpperCase()]}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delay */}
            <div className="bg-muted/60 border border-border rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold">⏱ Intervalo entre envios</p>
              <div className="flex gap-2 flex-wrap">
                {[3, 5, 10, 15, 30].map(s => (
                  <button key={s} onClick={() => setDelaySeconds(s)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${delaySeconds === s ? 'bg-navy text-white border-navy' : 'border-border text-muted-foreground hover:border-navy hover:text-navy'}`}>
                    {s}s
                  </button>
                ))}
              </div>
              {recipients.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Estimativa: ~{Math.ceil((recipients.length * delaySeconds) / 60)} min para {recipients.length} mensagens
                </p>
              )}
            </div>

            {recipients.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-warning bg-warning/5 border border-warning/20 rounded-lg p-2">
                <AlertTriangle size={13} /> Nenhum destinatário selecionado
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button onClick={handleSend} disabled={recipients.length === 0} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                <Send size={13} className="mr-1.5" /> Enviar para {recipients.length} contatos
              </Button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="py-10 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <span className="w-7 h-7 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Enviando mensagens...</p>
              <p className="text-sm text-muted-foreground mt-1">{sentCount} de {recipients.length} enviadas</p>
              {errorCount > 0 && <p className="text-xs text-destructive mt-0.5">{errorCount} erro(s)</p>}
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="py-10 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle size={28} className="text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-semibold text-destructive">Falha no envio</p>
              {lastError && <p className="text-xs text-muted-foreground bg-destructive/5 border border-destructive/20 rounded p-2 font-mono">{lastError}</p>}
            </div>
            <Button variant="outline" onClick={() => setStep('config')}>Voltar</Button>
          </div>
        )}

        {step === 'done' && (
          <div className="py-10 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Campanha enviada!</p>
              <p className="text-sm text-muted-foreground mt-1">{sentCount} mensagens enviadas com sucesso.</p>
              {errorCount > 0 && <p className="text-xs text-destructive">{errorCount} erros.</p>}
            </div>
            <Button onClick={onClose} className="bg-navy text-white px-8">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}