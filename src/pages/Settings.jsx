import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Settings2, User, Mail, Bell, Shield, Palette,
  Save, Check, Building2, Phone, Globe, Key, Sheet
} from 'lucide-react';
import GoogleSheetsSync from '@/components/settings/GoogleSheetsSync';
import SupabaseStatus from '@/components/settings/SupabaseStatus.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const tabs = [
  { id: 'perfil', label: 'Perfil do Escritório', icon: Building2 },
  { id: 'remetente', label: 'Remetente de E-mail', icon: Mail },
  { id: 'integracoes', label: 'Integrações', icon: Sheet },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('perfil');
  const [saved, setSaved] = useState(false);

  const [perfil, setPerfil] = useState({
    escritorio: 'Escritório Jurídico Dr. Marcos',
    responsavel: 'Marcos',
    email_contato: 'marcos@escritorio.adv.br',
    telefone: '+55 11 99999-9999',
    website: 'www.escritoriojuridico.adv.br',
    endereco: 'São Paulo - SP',
    bio: 'Especialistas em direito eleitoral e partidário. Atendemos partidos políticos em todo o Brasil com foco nas eleições 2026.',
  });

  const [remetente, setRemetente] = useState({
    nome: 'Marcos - Escritório Jurídico',
    email: 'marcos@escritorio.adv.br',
    email_resposta: 'contato@escritorio.adv.br',
    assinatura: 'Atenciosamente,\nDr. Marcos\nEspecialista em Direito Eleitoral\nOAB/SP 000.000',
  });

  const [notifs, setNotifs] = useState({
    email_aberto: true,
    clique_link: true,
    novo_lead: true,
    atendimento_humano: true,
    campanha_enviada: false,
    resumo_diario: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-5 lg:p-7 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-playfair text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie as preferências da plataforma</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Tab list */}
        <div className="lg:w-52 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-navy text-white font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card border border-border rounded-xl p-6 space-y-5">
          {activeTab === 'perfil' && (
            <>
              <h2 className="text-base font-semibold text-foreground">Perfil do Escritório</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Nome do Escritório</Label>
                  <Input value={perfil.escritorio} onChange={e => setPerfil({ ...perfil, escritorio: e.target.value })} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Responsável</Label>
                  <Input value={perfil.responsavel} onChange={e => setPerfil({ ...perfil, responsavel: e.target.value })} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">E-mail de Contato</Label>
                  <Input value={perfil.email_contato} onChange={e => setPerfil({ ...perfil, email_contato: e.target.value })} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Telefone / WhatsApp</Label>
                  <Input value={perfil.telefone} onChange={e => setPerfil({ ...perfil, telefone: e.target.value })} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Website</Label>
                  <Input value={perfil.website} onChange={e => setPerfil({ ...perfil, website: e.target.value })} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Cidade / Estado</Label>
                  <Input value={perfil.endereco} onChange={e => setPerfil({ ...perfil, endereco: e.target.value })} className="mt-1 h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Descrição do Escritório</Label>
                <Textarea value={perfil.bio} onChange={e => setPerfil({ ...perfil, bio: e.target.value })} className="mt-1 text-sm min-h-[80px]" />
              </div>
            </>
          )}

          {activeTab === 'remetente' && (
            <>
              <h2 className="text-base font-semibold text-foreground">Configurações de Remetente</h2>
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-xs text-foreground">
                <strong>Importante:</strong> O nome e e-mail do remetente são exibidos quando os partidos recebem seus e-mails.
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Nome do Remetente</Label>
                  <Input value={remetente.nome} onChange={e => setRemetente({ ...remetente, nome: e.target.value })} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">E-mail do Remetente</Label>
                  <Input type="email" value={remetente.email} onChange={e => setRemetente({ ...remetente, email: e.target.value })} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">E-mail de Resposta (Reply-To)</Label>
                  <Input type="email" value={remetente.email_resposta} onChange={e => setRemetente({ ...remetente, email_resposta: e.target.value })} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Assinatura Padrão</Label>
                  <Textarea value={remetente.assinatura} onChange={e => setRemetente({ ...remetente, assinatura: e.target.value })} className="mt-1 text-sm min-h-[100px] font-mono text-xs" />
                </div>
              </div>
            </>
          )}

          {activeTab === 'integracoes' && (
            <>
              <h2 className="text-base font-semibold text-foreground">Integrações Externas</h2>
              <p className="text-sm text-muted-foreground mb-4">Conecte fontes externas de leads ao CRM.</p>
              <GoogleSheetsSync />
              <div className="border-t border-border pt-5 mt-5">
                <SupabaseStatus />
              </div>
            </>
          )}

          {activeTab === 'notificacoes' && (
            <>
              <h2 className="text-base font-semibold text-foreground">Preferências de Notificação</h2>
              <p className="text-sm text-muted-foreground">Escolha quando receber alertas por e-mail e push.</p>
              <div className="space-y-4">
                {[
                  { key: 'atendimento_humano', label: 'Lead requer atendimento humano', desc: 'Quando a IA detecta intenção de fechamento', urgent: true },
                  { key: 'novo_lead', label: 'Novo lead capturado', desc: 'Via formulário, pop-up ou Google Sheets' },
                  { key: 'email_aberto', label: 'E-mail aberto', desc: 'Quando um partido abrir um e-mail' },
                  { key: 'clique_link', label: 'Clique em link', desc: 'Quando clicar em link de diagnóstico' },
                  { key: 'campanha_enviada', label: 'Campanha enviada', desc: 'Confirmação de disparo concluído' },
                  { key: 'resumo_diario', label: 'Resumo diário', desc: 'Relatório consolidado às 8h' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        {item.urgent && <span className="text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded font-semibold">Urgente</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch checked={notifs[item.key]} onCheckedChange={v => setNotifs({ ...notifs, [item.key]: v })} />
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'seguranca' && (
            <>
              <h2 className="text-base font-semibold text-foreground">Segurança e Acesso</h2>
              <div className="space-y-4">
                <div className="bg-muted rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-success/10 rounded-lg flex items-center justify-center">
                      <Shield size={16} className="text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Autenticação Ativa</p>
                      <p className="text-xs text-muted-foreground">Sua conta está protegida pela plataforma Base44</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Sessões Ativas</p>
                  <div className="space-y-2">
                    {['Chrome — São Paulo, BR', 'Safari Mobile — São Paulo, BR'].map(s => (
                      <div key={s} className="flex items-center justify-between text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
                        <span>{s}</span>
                        <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">Ativa</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Chave de API</p>
                  <p className="text-xs text-muted-foreground mb-2">Use para integrar com Google Sheets e sistemas externos</p>
                  <div className="flex gap-2">
                    <Input value="sk-legaltech-2026-••••••••••••••••" readOnly className="h-9 text-sm font-mono bg-muted" />
                    <Button variant="outline" size="sm" className="h-9 px-3">
                      <Key size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-2">
            <Button onClick={handleSave} className="bg-navy text-white hover:bg-navy/90">
              {saved ? <><Check size={13} className="mr-1.5 text-success" />Salvo!</> : <><Save size={13} className="mr-1.5" />Salvar Alterações</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}