import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';

const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function NewContactModal({ onClose }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', party_name: '', party_acronym: '',
    city: '', state: '', interest_area: 'nenhum', source: 'manual',
  });
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create({ ...data, status: 'novo', email_valid: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); onClose(); },
  });

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-playfair flex items-center gap-2">
            <UserPlus size={16} className="text-navy" /> Novo Contato
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label className="text-xs">Nome do Responsável</Label>
            <Input value={form.name} onChange={e => f('name', e.target.value)} className="mt-1 h-9 text-sm" placeholder="Nome completo" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">E-mail *</Label>
            <Input type="email" value={form.email} onChange={e => f('email', e.target.value)} className="mt-1 h-9 text-sm" placeholder="email@partido.org.br" />
          </div>
          <div>
            <Label className="text-xs">Telefone / WhatsApp</Label>
            <Input value={form.phone} onChange={e => f('phone', e.target.value)} className="mt-1 h-9 text-sm" placeholder="+55 11 99999-9999" />
          </div>
          <div>
            <Label className="text-xs">Área de Interesse</Label>
            <Select value={form.interest_area} onValueChange={v => f('interest_area', v)}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Não definido</SelectItem>
                <SelectItem value="regularizacao_cnpj">Regularização CNPJ</SelectItem>
                <SelectItem value="contas_2025">Contas 2025</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nome do Partido</Label>
            <Input value={form.party_name} onChange={e => f('party_name', e.target.value)} className="mt-1 h-9 text-sm" placeholder="Ex: Partido dos Trabalhadores" />
          </div>
          <div>
            <Label className="text-xs">Sigla</Label>
            <Input value={form.party_acronym} onChange={e => f('party_acronym', e.target.value)} className="mt-1 h-9 text-sm" placeholder="Ex: PT" />
          </div>
          <div>
            <Label className="text-xs">Cidade</Label>
            <Input value={form.city} onChange={e => f('city', e.target.value)} className="mt-1 h-9 text-sm" placeholder="São Paulo" />
          </div>
          <div>
            <Label className="text-xs">Estado</Label>
            <Select value={form.state} onValueChange={v => f('state', v)}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {BR_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={() => createMutation.mutate(form)}
          disabled={!form.email || createMutation.isPending}
          className="w-full bg-navy text-white"
        >
          {createMutation.isPending ? 'Salvando...' : 'Criar Contato'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}