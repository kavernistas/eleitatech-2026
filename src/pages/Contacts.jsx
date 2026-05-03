import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Search, Filter, Plus, Upload, Download, Tag,
  Mail, Phone, MapPin, Clock, ChevronRight,
  CheckCircle, AlertCircle, Circle, Star, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ContactCard from '@/components/contacts/ContactCard';
import ContactDetail from '@/components/contacts/ContactDetail';
import ImportModal from '@/components/contacts/ImportModal';
import NewContactModal from '@/components/contacts/NewContactModal';

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
  const [selectedContact, setSelectedContact] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date', 200),
  });

  const filtered = contacts.filter(c => {
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.party_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload size={14} className="mr-1.5" /> Importar
            </Button>
            <Button size="sm" className="bg-navy text-white hover:bg-navy/90" onClick={() => setShowNew(true)}>
              <Plus size={14} className="mr-1.5" /> Novo Contato
            </Button>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              placeholder="Buscar por nome, e-mail ou partido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="contato_feito">Contato Feito</SelectItem>
              <SelectItem value="interessado">Interessado</SelectItem>
              <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
              <SelectItem value="fechado">Fechado</SelectItem>
              <SelectItem value="atendimento_humano">Atendimento Humano</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
              <ContactCard
                key={contact.id}
                contact={contact}
                selected={selectedContact?.id === contact.id}
                statusColors={statusColors}
                onClick={() => setSelectedContact(contact)}
              />
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
    </div>
  );
}