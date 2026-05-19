import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Scale, Loader2 } from 'lucide-react';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function CadastrarContato() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', party_name: '', party_acronym: '',
    city: '', state: '', interest_area: 'nenhum',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) { setError('E-mail é obrigatório.'); return; }
    setLoading(true);
    setError('');
    try {
      await base44.entities.Contact.create({ ...form, source: 'formulario_web', status: 'novo' });
      setSuccess(true);
    } catch (err) {
      setError('Erro ao cadastrar. Verifique os dados e tente novamente.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Cadastro realizado!</h2>
          <p className="text-muted-foreground text-sm">Entraremos em contato em breve para apresentar nossas soluções de contabilidade partidária e eleitoral.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="gradient-navy px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="font-playfair font-bold text-lg leading-tight">LegalTech Partidária</p>
              <p className="text-white/70 text-xs">Contabilidade Eleitoral 2026</p>
            </div>
          </div>
          <h1 className="font-playfair text-xl font-bold">Solicite seu Diagnóstico Gratuito</h1>
          <p className="text-white/80 text-sm mt-1">Regularização de CNPJ e prestação de contas para partidos políticos</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-foreground mb-1 block">Nome do Responsável</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-foreground mb-1 block">E-mail <span className="text-destructive">*</span></label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@partido.org.br" required />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Telefone / WhatsApp</label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+55 11 99999-9999" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Área de Interesse</label>
              <Select value={form.interest_area} onValueChange={v => set('interest_area', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <label className="text-xs font-medium text-foreground mb-1 block">Nome do Partido</label>
              <Input value={form.party_name} onChange={e => set('party_name', e.target.value)} placeholder="Ex: Partido dos Trabalhadores" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Sigla</label>
              <Input value={form.party_acronym} onChange={e => set('party_acronym', e.target.value)} placeholder="Ex: PT" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Cidade</label>
              <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="São Paulo" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Estado</label>
              <Select value={form.state} onValueChange={v => set('state', v)}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full bg-navy hover:bg-navy/90 text-white h-11 font-semibold">
            {loading ? <><Loader2 size={16} className="animate-spin mr-2" />Enviando...</> : 'Solicitar Diagnóstico Gratuito'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Seus dados estão seguros e não serão compartilhados com terceiros.
          </p>
        </form>
      </div>
    </div>
  );
}