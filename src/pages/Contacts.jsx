import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Search, Filter, Plus, Upload, Download, Tag,
  Mail, Phone, MapPin, Clock, ChevronRight,
  CheckCircle, AlertCircle, Circle, Star, Users, X
} from 'lucide-react';

function exportToCSV(contacts) {
  const headers = ['Nome', 'E-mail', 'Telefone', 'Partido', 'Sigla', 'Cidade', 'Estado', 'Status', 'Tags', 'Interesse'];
  const rows = contacts.map(c => [
    c.name || '', c.email || '', c.phone || '',
    c.party_name || '', c.party_acronym || '',
    c.city || '', c.state || '',
    c.status || '', (c.tags || []).join('; '), c.interest_area || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `contatos_legaltech_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ContactCard from '@/components/contacts/ContactCard';
import ContactDetail from '@/components/contacts/ContactDetail';
import ImportModal from '@/components/contacts/ImportModal';
import NewContactModal from '@/components/contacts/NewContactModal';
import BulkEmailModal from '@/components/contacts/BulkEmailModal.jsx';

const statusColors = {
  novo: 'bg-muted text-muted-foreground',
  contato_feito: 'bg-blue-100 text-blue-700',
  interessado: 'bg-yellow-100 text-yellow-700',
  proposta_enviada: 'bg-orange-100 text-orange-700',
  fechado: 'bg-green-100 text-green-700',
  atendimento_humano: 'bg-red-100 text-red-700',
  inativo: 'bg-gray-100 text-gray-500',
};

export default function Contacts() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [partyFilter, setPartyFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [situationFilter, setSituationFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date', 5000),
  });

  // Derive unique values for filter dropdowns
  const parties = [...new Set(contacts.map(c => c.party_name).filter(Boolean))].sort();
  const states = [...new Set(contacts.map(c => c.state).filter(Boolean))].sort();
  const situations = [...new Set(contacts.map(c => c.situation).filter(Boolean))].sort();

  const activeFilterCount = [
    partyFilter !== 'all', stateFilter !== 'all', cityFilter, situationFilter !== 'all', statusFilter !== 'all'
  ].filter(Boolean).length;

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.party_name?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.cnpj?.includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchParty = partyFilter === 'all' || c.party_name === partyFilter;
    const matchState = stateFilter === 'all' || c.state === stateFilter;
    const matchCity = !cityFilter || c.city?.toLowerCase().includes(cityFilter.toLowerCase());
    const matchSituation = situationFilter === 'all' || c.situation === situationFilter;
    return matchSearch && matchStatus && matchParty && matchState && matchCity && matchSituation;
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const selectedContacts = filtered.filter(c => selectedIds.has(c.id));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 lg:px-7 py-5 border-b border-border bg-card/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-foreground">Contatos</h1>
            <p className="text-muted-foreground text-sm">{contacts.length.toLocaleString('pt-BR')} partidos cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>
                  <X size={14} className="mr-1.5" /> Cancelar
                </Button>
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedIds.size === filtered.length ? 'Desmarcar todos' : `Selecionar todos (${filtered.length})`}
                </Button>
                <Button
                  size="sm"
                  className="bg-navy text-white hover:bg-navy/90"
                  disabled={selectedIds.size === 0}
                  onClick={() => setShowBulkEmail(true)}
                >
                  <Mail size={14} className="mr-1.5" />
                  Disparar e-mail ({selectedIds.size})
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered)} title="Exportar para CSV">
                  <Download size={14} className="mr-1.5" /> Exportar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                  <Upload size={14} className="mr-1.5" /> Importar
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectionMode(true); setSelectedIds(new Set()); setSelectedContact(null); }}>
                  <Mail size={14} className="mr-1.5" /> Disparar E-mails
                </Button>
                <Button size="sm" className="bg-navy text-white hover:bg-navy/90" onClick={() => setShowNew(true)}>
                  <Plus size={14} className="mr-1.5" /> Novo Contato
                </Button>
              </>
            )}
          </div>
        </div>
        {/* Search + filter toggle row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              placeholder="Buscar por nome, e-mail, partido, cidade, CNPJ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button
            variant="outline" size="sm"
            className={`h-9 gap-1.5 ${showFilters ? 'border-navy text-navy' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter size={14} />
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-navy text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>
            )}
          </Button>
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Select value={partyFilter} onValueChange={setPartyFilter}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Partido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os partidos</SelectItem>
                {parties.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os UF</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input
              placeholder="Cidade..."
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="w-36 h-8 text-xs"
            />

            <Select value={situationFilter} onValueChange={setSituationFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas situações</SelectItem>
                {situations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Status CRM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status CRM</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="contato_feito">Contato Feito</SelectItem>
                <SelectItem value="interessado">Interessado</SelectItem>
                <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
                <SelectItem value="atendimento_humano">Atendimento Humano</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
                onClick={() => { setPartyFilter('all'); setStateFilter('all'); setCityFilter(''); setSituationFilter('all'); setStatusFilter('all'); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-muted-foreground">
          {filtered.length.toLocaleString('pt-BR')} de {contacts.length.toLocaleString('pt-BR')} contatos
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className={`${selectedContact ? 'hidden lg:flex' : 'flex'} flex-col flex-1 lg:flex-none lg:w-[420px] border-r border-border overflow-y-auto`}>
          {isLoading ? (
            <div className="flex items-center justify-center flex-1 p-8">
              <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
              <Users size={40} className="text-muted-foreground mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">Nenhum contato encontrado</p>
              <Button size="sm" className="mt-3" onClick={() => setShowImport(true)}>
                <Upload size={13} className="mr-1.5" /> Importar planilha
              </Button>
            </div>
          ) : (
            filtered.map(contact => (
              <div key={contact.id} className="relative flex items-stretch">
                {selectionMode && (
                  <button
                    onClick={() => toggleSelect(contact.id)}
                    className={`flex-shrink-0 w-10 flex items-center justify-center border-r border-border transition-colors ${
                      selectedIds.has(contact.id) ? 'bg-navy/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(contact.id) ? 'bg-navy border-navy' : 'border-muted-foreground/40'
                    }`}>
                      {selectedIds.has(contact.id) && <CheckCircle size={10} className="text-white" />}
                    </div>
                  </button>
                )}
                <div className="flex-1">
                  <ContactCard
                    contact={contact}
                    selected={selectionMode ? selectedIds.has(contact.id) : selectedContact?.id === contact.id}
                    statusColors={statusColors}
                    onClick={() => selectionMode ? toggleSelect(contact.id) : setSelectedContact(contact)}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedContact ? (
          <div className="flex-1 overflow-y-auto">
            <ContactDetail
              contact={selectedContact}
              statusColors={statusColors}
              onClose={() => setSelectedContact(null)}
            />
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ChevronRight size={28} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">Selecione um contato</p>
              <p className="text-muted-foreground text-xs mt-1">para ver o histórico completo</p>
            </div>
          </div>
        )}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showNew && <NewContactModal onClose={() => setShowNew(false)} />}
      {showBulkEmail && (
        <BulkEmailModal
          contacts={selectedContacts}
          onClose={() => { setShowBulkEmail(false); setSelectionMode(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}