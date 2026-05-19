import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Save, Eye, EyeOff, Send, Loader2, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

const FIELDS = [
  {
    key: 'TURBOSMTP_CONSUMER_KEY',
    label: 'Consumer Key',
    placeholder: 'eb2add197fb1522a664f',
    type: 'password',
    hint: 'Encontre em: dashboard.serversmtp.com → Settings → API Keys',
  },
  {
    key: 'TURBOSMTP_CONSUMER_SECRET',
    label: 'Consumer Secret',
    placeholder: 'g6dCphFBLuHVTqo1lMaX',
    type: 'password',
    hint: 'Atenção: o Consumer Secret é exibido apenas uma vez ao criar a chave.',
  },
  {
    key: 'TURBOSMTP_FROM_EMAIL',
    label: 'E-mail Remetente (From)',
    placeholder: 'contato@marcoseduardocontabil.com.br',
    type: 'text',
    hint: 'Deve ser o e-mail autenticado/verificado na sua conta TurboSMTP.',
  },
  {
    key: 'TURBOSMTP_FROM_NAME',
    label: 'Nome Remetente',
    placeholder: 'Marcos Eduardo - Contador Partidário e Eleitoral',
    type: 'text',
  },
];

function MaskedInput({ field, value, onChange }) {
  const [show, setShow] = useState(false);
  if (field.type !== 'password') {
    return (
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="mt-1 h-9 text-sm font-mono"
      />
    );
  }
  return (
    <div className="relative mt-1">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="h-9 text-sm font-mono pr-9"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

export default function TurboSmtpSettings() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({});
  const [saved, setSaved] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null); // null | 'sending' | 'ok' | 'error'
  const [testError, setTestError] = useState('');

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings-turbosmtp'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  useEffect(() => {
    if (!settings.length) return;
    const map = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
    const filled = {};
    FIELDS.forEach(f => { if (map[f.key]) filled[f.key] = map[f.key]; });
    setValues(filled);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (vals) => {
      const existing = settings.reduce((acc, s) => { acc[s.key] = s; return acc; }, {});
      await Promise.all(
        Object.entries(vals)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([key, value]) => {
            if (existing[key]) return base44.entities.AppSettings.update(existing[key].id, { value });
            return base44.entities.AppSettings.create({ key, value });
          })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-turbosmtp'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings-apikeys'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleSave = () => mutation.mutate(values);

  const handleTest = async () => {
    if (!testEmail) return;
    setTestResult('sending');
    setTestError('');
    try {
      await base44.functions.invoke('sendEmailTurboSMTP', {
        to: testEmail,
        subject: '✅ Teste TurboSMTP — LegalTech 2026',
        html_body: '<p>Este é um e-mail de teste enviado via <strong>TurboSMTP API</strong> pela plataforma LegalTech 2026.</p><p>Se você recebeu esta mensagem, o envio está funcionando corretamente! 🎉</p>',
      });
      setTestResult('ok');
    } catch (err) {
      setTestResult('error');
      setTestError(err?.message || 'Erro desconhecido');
    }
  };

  const allConfigured = FIELDS.slice(0, 3).every(f => values[f.key]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">TurboSMTP — API de Envio</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Via única de envio de e-mails da plataforma</p>
        </div>
        <a
          href="https://dashboard.serversmtp.com/settings/integrations"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink size={11} /> Abrir TurboSMTP
        </a>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${
        allConfigured
          ? 'bg-success/10 border-success/30 text-success'
          : 'bg-warning/10 border-warning/30 text-warning'
      }`}>
        {allConfigured
          ? <><CheckCircle2 size={15} /> Credenciais configuradas</>
          : <><AlertCircle size={15} /> Credenciais ainda não configuradas</>
        }
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {FIELDS.map(field => (
          <div key={field.key}>
            <Label className="text-xs font-medium">{field.label}</Label>
            <MaskedInput
              field={field}
              value={values[field.key] || ''}
              onChange={v => setValues(prev => ({ ...prev, [field.key]: v }))}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{field.key}</p>
            {field.hint && <p className="text-[10px] text-amber-600 mt-0.5">💡 {field.hint}</p>}
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={mutation.isPending} className="bg-navy text-white hover:bg-navy/90">
        {mutation.isPending
          ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Salvando...</>
          : saved
          ? <><Check size={13} className="mr-1.5 text-green-300" />Salvo com sucesso!</>
          : <><Save size={13} className="mr-1.5" />Salvar Credenciais</>
        }
      </Button>

      {/* Test send */}
      <div className="border-t border-border pt-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Testar Envio</h3>
        <p className="text-xs text-muted-foreground">Envie um e-mail de teste para confirmar que as credenciais estão corretas.</p>
        <div className="flex gap-2">
          <Input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="seu@email.com.br"
            className="h-9 text-sm flex-1"
          />
          <Button
            onClick={handleTest}
            disabled={!testEmail || testResult === 'sending' || !allConfigured}
            variant="outline"
            className="h-9 gap-1.5"
          >
            {testResult === 'sending'
              ? <><Loader2 size={13} className="animate-spin" />Enviando...</>
              : <><Send size={13} />Testar</>
            }
          </Button>
        </div>
        {testResult === 'ok' && (
          <div className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} /> E-mail enviado com sucesso! Verifique sua caixa de entrada.
          </div>
        )}
        {testResult === 'error' && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
            <span>Erro: {testError}</span>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Como obter as credenciais</p>
        <ol className="text-xs text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
          <li>Acesse <strong>dashboard.serversmtp.com</strong> → Settings → API Keys</li>
          <li>Clique em <strong>"Create Consumer Key"</strong> (ou use uma existente como "LegalTech")</li>
          <li>Copie o <strong>Consumer Key</strong> e o <strong>Consumer Secret</strong> e cole nos campos acima</li>
          <li>Salve e clique em <strong>"Testar"</strong> para confirmar o funcionamento</li>
        </ol>
      </div>
    </div>
  );
}