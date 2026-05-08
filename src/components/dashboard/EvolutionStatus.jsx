import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EvolutionStatus() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const { data: status, refetch, isFetching } = useQuery({
    queryKey: ['evolution-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('evolutionApi', { action: 'getStatus' });
      return res.data;
    },
    retry: false,
    refetchInterval: 60000,
  });

  const isConnected = status?.instance?.state === 'open' || status?.state === 'open';
  const instanceName = status?.instance?.instanceName || status?.instance?.name || '—';

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('evolutionApi', { action: 'getStatus' });
      const data = res.data;
      const connected = data?.instance?.state === 'open' || data?.state === 'open';
      setTestResult({ ok: connected, msg: connected ? 'Conexão OK! WhatsApp conectado.' : `Estado: ${data?.instance?.state || data?.state || 'desconhecido'}` });
    } catch (e) {
      setTestResult({ ok: false, msg: `Erro: ${e.message || 'Falha na conexão com Evolution API'}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${isConnected ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isConnected ? 'bg-success/10' : 'bg-destructive/10'}`}>
        {isFetching ? <Loader2 size={18} className="animate-spin text-muted-foreground" /> :
          isConnected ? <Wifi size={18} className="text-success" /> : <WifiOff size={18} className="text-destructive" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Evolution API — WhatsApp
          <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${isConnected ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {isConnected ? 'Conectado' : status ? 'Desconectado' : 'Verificando...'}
          </span>
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {instanceName !== '—' ? `Instância: ${instanceName}` : 'Configure as chaves da API em Configurações → Integrações'}
        </p>
        {testResult && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${testResult.ok ? 'text-success' : 'text-destructive'}`}>
            {testResult.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
            {testResult.msg}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
          Atualizar
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 size={11} className="animate-spin" /> : 'Testar'}
        </Button>
      </div>
    </div>
  );
}