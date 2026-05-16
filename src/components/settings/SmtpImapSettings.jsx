import { Server, Lock, Mail, Info } from 'lucide-react';

const servers = [
  {
    label: 'Entrada (IMAP)',
    icon: '📥',
    host: 'imap.hostinger.com',
    port: '993',
    encryption: 'SSL',
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    label: 'Entrada (POP)',
    icon: '📥',
    host: 'pop.hostinger.com',
    port: '995',
    encryption: 'SSL',
    color: 'bg-purple-50 border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    label: 'Saída (SMTP)',
    icon: '📤',
    host: 'smtp.hostinger.com',
    port: '465',
    encryption: 'SSL',
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
  },
];

export default function SmtpImapSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Server size={14} className="text-navy" />
        <h3 className="text-sm font-semibold text-foreground">Configuração de Servidor de E-mail</h3>
      </div>

      <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 flex gap-2 text-xs text-foreground">
        <Info size={13} className="text-gold flex-shrink-0 mt-0.5" />
        <div>
          <strong>Conta:</strong> contato@marcoseduardocontabil.com.br — Hostinger<br />
          Use estas configurações no seu cliente de e-mail (Outlook, Thunderbird, Apple Mail etc.)
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {servers.map((s) => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">{s.icon}</span>
                <span className="text-sm font-semibold text-foreground">{s.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock size={11} className="text-muted-foreground" />
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
                  {s.encryption}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Servidor</p>
                <p className="text-xs font-mono font-medium text-foreground bg-white/70 rounded-md px-2 py-1.5 border border-white/80">
                  {s.host}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Porta</p>
                <p className="text-xs font-mono font-medium text-foreground bg-white/70 rounded-md px-2 py-1.5 border border-white/80">
                  {s.port}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Mail size={12} className="text-navy" /> Credenciais de acesso
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-background border border-border rounded-lg px-3 py-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">Usuário / Login</p>
            <p className="font-mono font-medium text-foreground">contato@marcoseduardocontabil.com.br</p>
          </div>
          <div className="bg-background border border-border rounded-lg px-3 py-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">Senha</p>
            <p className="font-mono text-muted-foreground">••••••••••••</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">Use a senha da sua conta de e-mail na Hostinger.</p>
      </div>
    </div>
  );
}