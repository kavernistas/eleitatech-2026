import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Webhook, Copy, Check, Eye, EyeOff, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const WEBHOOK_URL = `${window.location.origin.replace('preview-sandbox--', '').replace('.base44.app', '')}/api/apps/${window.__APP_ID__ || '...'}/functions/leadWebhook`;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors ml-2">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  );
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto text-foreground whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      </button>
    </div>
  );
}

export default function WebhookDocs() {
  const queryClient = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [savedSecret, setSavedSecret] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings-apikeys'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const currentSecret = settings.find(s => s.key === 'LEAD_WEBHOOK_SECRET')?.value || '';

  const mutation = useMutation({
    mutationFn: async (val) => {
      const existing = settings.find(s => s.key === 'LEAD_WEBHOOK_SECRET');
      if (existing) {
        await base44.entities.AppSettings.update(existing.id, { value: val });
      } else {
        await base44.entities.AppSettings.create({ key: 'LEAD_WEBHOOK_SECRET', value: val });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-apikeys'] });
      setSavedSecret(true);
      setTimeout(() => setSavedSecret(false), 2000);
    }
  });

  // Build the actual function URLs from base44 client
  const appId = appParams.appId || '';
  const functionUrl = `https://backend.base44.app/api/apps/${appId}/functions/leadWebhook`;
  const whatsappWebhookUrl = `https://backend.base44.app/api/apps/${appId}/functions/whatsappWebhook`;

  const examplePayload = JSON.stringify({
    name: "João Silva",
    email: "joao@diretorio.org.br",
    phone: "11999998888",
    party_name: "Partido Exemplo",
    party_acronym: "PE",
    role: "Tesoureiro",
    city: "São Paulo",
    state: "SP"
  }, null, 2);

  const curlExample = `curl -X POST "${functionUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: SEU_SECRET" \\
  -d '${JSON.stringify({ name: "João Silva", email: "joao@diretorio.org.br", phone: "11999998888", party_name: "Partido Exemplo" })}'`;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Webhook size={16} className="text-primary" />
        <h3 className="font-semibold text-foreground text-sm">Webhook de Captação de Leads</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Use esta URL para receber leads automaticamente de <strong>Typeform</strong>, formulários do seu site, RD Station ou qualquer ferramenta externa.
        Ao receber um lead com WhatsApp, a mensagem de boas-vindas é disparada instantaneamente.
      </p>

      {/* URL do endpoint */}
      <div>
        <Label className="text-xs">URL do Webhook</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            readOnly
            value={functionUrl}
            className="h-9 text-xs font-mono bg-muted"
          />
          <CopyButton text={functionUrl} />
          <a href={`${functionUrl}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} className="text-muted-foreground hover:text-foreground" />
          </a>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Método: <strong>POST</strong> • Content-Type: application/json</p>
      </div>

      {/* Secret */}
      <div>
        <Label className="text-xs">Chave Secreta (opcional, mas recomendado)</Label>
        <div className="flex items-center gap-2 mt-1">
          <div className="relative flex-1">
            <Input
              type={showSecret ? 'text' : 'password'}
              value={secretInput || currentSecret}
              onChange={e => setSecretInput(e.target.value)}
              placeholder={currentSecret ? '••••••••••••' : 'Ex: meu-secret-seguro-2026'}
              className="h-9 text-sm font-mono pr-9"
            />
            <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-xs"
            disabled={mutation.isPending || !secretInput}
            onClick={() => mutation.mutate(secretInput)}
          >
            {savedSecret ? <><Check size={12} className="mr-1 text-green-500" />Salvo</> : 'Salvar'}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Envie no header: <code className="bg-muted px-1 rounded">x-webhook-secret: SEU_SECRET</code> ou como query param <code className="bg-muted px-1 rounded">?secret=SEU_SECRET</code>
        </p>
      </div>

      {/* Payload esperado */}
      <div>
        <Label className="text-xs mb-1 block">Payload JSON esperado</Label>
        <CodeBlock code={examplePayload} />
        <p className="text-[10px] text-muted-foreground mt-1">Campos obrigatórios: <code>email</code> ou <code>phone</code> (pelo menos um).</p>
      </div>

      {/* cURL exemplo */}
      <div>
        <Label className="text-xs mb-1 block">Exemplo cURL</Label>
        <CodeBlock code={curlExample} />
      </div>

      {/* Fontes suportadas */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground">Fontes suportadas automaticamente:</p>
        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          {['✅ Typeform', '✅ RD Station', '✅ Formulário HTML genérico', '✅ Zapier / Make', '✅ N8N', '✅ Qualquer POST JSON'].map(s => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </div>

      {/* Typeform config */}
      <div className="border border-border rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground">Como configurar no Typeform:</p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Abra seu formulário no Typeform → <strong>Connect → Webhooks</strong></li>
          <li>Cole a URL acima e adicione o header <code className="bg-muted px-1 rounded">x-webhook-secret</code></li>
          <li>Certifique-se de ter campos com <strong>"nome"</strong>, <strong>"telefone/whatsapp"</strong> e <strong>"e-mail"</strong> no título</li>
          <li>Ative o webhook e teste com um envio de teste</li>
        </ol>
      </div>

      {/* Evolution API Webhook */}
      <div className="border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1">
          ⚡ Webhook da Evolution API (WhatsApp)
        </p>
        <p className="text-xs text-muted-foreground">
          Para que as mensagens recebidas no WhatsApp sejam processadas pelo assistente de IA, configure o webhook na Evolution API com a URL abaixo — <strong>diferente</strong> do webhook de captação de leads.
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Input
            readOnly
            value={whatsappWebhookUrl}
            className="h-9 text-xs font-mono bg-muted"
          />
          <CopyButton text={whatsappWebhookUrl} />
          <a href={whatsappWebhookUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} className="text-muted-foreground hover:text-foreground" />
          </a>
        </div>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside mt-2">
          <li>Acesse a Evolution API → sua instância → <strong>Events → Webhook</strong></li>
          <li>Cole a URL acima no campo <strong>URL</strong></li>
          <li>Ative o evento <strong>messages.upsert</strong></li>
          <li>Adicione o header <code className="bg-muted px-1 rounded">x-webhook-secret: SEU_SECRET</code> se configurado</li>
        </ol>
      </div>
    </div>
  );
}