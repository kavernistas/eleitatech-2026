import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';

const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function EditContactModal({ contact, onClose }) {
  const [form, setForm] = useState({
    name: contact.name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    party_name: contact.party_name || '',
    party_acronym: contact.party_acronym || '',
    organ_type: contact.organ_type || '',
    cnpj: contact.cnpj || '',
    role: contact.role || '',
    city: contact.city || '',
    state: contact.state || '',
    address: contact.address || '',
    zip_code: contact.zip_code || '',
    situation: contact.situation || '',
  });

  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.update(contact.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      onClose();
    },
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-playfair">Editar Contato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Seção: Responsável */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Responsável</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={form.name} onChange={set('name')} placeholder="Nome completo" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cargo</Label>
                <Input value={form.role} onChange={set('role')} placeholder="Ex: Presidente, Tesoureiro" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">E-mail *</Label>
                <Input value={form.email} onChange={set('email')} placeholder="email@exemplo.com" type="email" required className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone / WhatsApp</Label>
                <Input value={form.phone} onChange={set('phone')} placeholder="(11) 99999-9999" className="h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* Seção: Partido */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Partido</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome do Partido</Label>
                <Input value={form.party_name} onChange={set('party_name')} placeholder="Ex: Partido dos Trabalhadores" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sigla</Label>
                <Input value={form.party_acronym} onChange={set('party_acronym')} placeholder="Ex: PT" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo do Órgão</Label>
                <Input value={form.organ_type} onChange={set('organ_type')} placeholder="Ex: Diretório Municipal" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Situação</Label>
                <Input value={form.situation} onChange={set('situation')} placeholder="Ex: Ativo, Cancelado" className="h-8 text-sm" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">CNPJ</Label>
                <Input value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" className="h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* Seção: Localização */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Localização</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cidade</Label>
                <Input value={form.city} onChange={set('city')} placeholder="Cidade" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {BR_STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Endereço</Label>
                <Input value={form.address} onChange={set('address')} placeholder="Rua, número" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CEP</Label>
                <Input value={form.zip_code} onChange={set('zip_code')} placeholder="00000-000" className="h-8 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={updateMutation.isPending} className="flex-1 bg-navy text-white">
              {updateMutation.isPending
                ? <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1.5" />Salvando...</>
                : <><Save size={13} className="mr-1.5" />Salvar Alterações</>
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}