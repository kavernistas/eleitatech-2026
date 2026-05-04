import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Copy, XCircle, Database, Key, Globe, Server } from 'lucide-react';
import { toast } from 'sonner';

const statusColor = {
  ACTIVE_HEALTHY: 'bg-green-100 text-green-700',
  ACTIVE_UNHEALTHY: 'bg-yellow-100 text-yellow-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  COMING_UP: 'bg-blue-100 text-blue-700',
  GOING_DOWN: 'bg-red-100 text-red-700',
};

const statusLabel = {
  ACTIVE_HEALTHY: 'Saudável',
  ACTIVE_UNHEALTHY: 'Com problemas',
  INACTIVE: 'Inativo',
  COMING_UP: 'Iniciando',
  GOING_DOWN: 'Encerrando',
};

function MaskedKey({ value }) {
  const [visible, setVisible] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(value);
    toast.success('Chave copiada!');
  };

  if (!value) return <span className="text-muted-foreground text-xs italic">Não disponível</span>;

  return (
    <div className="flex items-center gap-2 mt-1">
      <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all flex-1">
        {visible ? value : `${value.slice(0, 20)}${'•'.repeat(20)}`}
      </code>
      <button onClick={() => setVisible(v => !v)} className="text-xs text-primary underline shrink-0">
        {visible ? 'Ocultar' : 'Ver'}
      </button>
      <button onClick={copyKey} className="shrink-0 text-muted-foreground hover:text-foreground">
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function SupabaseStatus() {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('supabaseStatus', {});
      setProjects(res.data.projects);
    } catch (e) {
      setError(e.message || 'Erro ao buscar dados do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-600" />
            Status Supabase
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Projetos e chaves de API conectadas</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Carregando...' : projects ? 'Atualizar' : 'Verificar'}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {projects && projects.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum projeto Supabase encontrado.</p>
      )}

      {projects && projects.map(project => (
        <div key={project.ref} className="border border-border rounded-xl p-4 space-y-3 bg-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-foreground">{project.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{project.ref}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[project.status] || 'bg-gray-100 text-gray-500'}`}>
              {statusLabel[project.status] || project.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{project.api_url}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{project.database_host}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-border">
            <div>
              <p className="text-xs font-medium text-foreground flex items-center gap-1">
                <Key className="h-3 w-3" /> Anon Key (pública)
              </p>
              <MaskedKey value={project.anon_key} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground flex items-center gap-1">
                <Key className="h-3 w-3 text-amber-500" /> Service Role Key (secreta)
              </p>
              <MaskedKey value={project.service_role_key} />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Região: <span className="font-medium text-foreground">{project.region}</span>
            {project.created_at && (
              <> · Criado em: <span className="font-medium text-foreground">{new Date(project.created_at).toLocaleDateString('pt-BR')}</span></>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}