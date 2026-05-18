import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart2, MousePointer, Mail, TrendingUp, Users, Target, Percent } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const COLORS = ['hsl(222,65%,28%)', 'hsl(38,75%,52%)', 'hsl(142,71%,45%)', 'hsl(0,72%,51%)', 'hsl(220,10%,55%)'];

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-xs">
      <BarChart2 size={24} className="mb-2 opacity-25" />
      <p>{label}</p>
    </div>
  );
}

export default function Analytics() {
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['contacts-analytics'],
    queryFn: () => base44.entities.Contact.list('-created_date', 5000),
  });

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns-analytics'],
    queryFn: () => base44.entities.Campaign.list('-created_date', 200),
  });

  const loading = loadingContacts || loadingCampaigns;

  // ── KPIs reais ────────────────────────────────────────────────────────────
  const totalSent = campaigns.reduce((s, c) => s + (c.total_sent || 0), 0);
  const totalOpened = campaigns.reduce((s, c) => s + (c.total_opened || 0), 0);
  const totalClicked = campaigns.reduce((s, c) => s + (c.total_clicked || 0), 0);
  const converted = contacts.filter(c => c.status === 'fechado').length;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : null;
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : null;
  const convRate = contacts.length > 0 ? ((converted / contacts.length) * 100).toFixed(1) : null;

  // ── Campanha por campanha (últimas 10 enviadas) ────────────────────────────
  const campaignPerf = useMemo(() => {
    return campaigns
      .filter(c => c.total_sent > 0)
      .slice(0, 10)
      .reverse()
      .map(c => ({
        name: c.name?.substring(0, 12) || 'Camp.',
        enviados: c.total_sent || 0,
        abertos: c.total_opened || 0,
        cliques: c.total_clicked || 0,
        abertura: c.total_sent ? +((c.total_opened / c.total_sent) * 100).toFixed(1) : 0,
        clique_pct: c.total_sent ? +((c.total_clicked / c.total_sent) * 100).toFixed(1) : 0,
      }));
  }, [campaigns]);

  // ── Distribuição por estado (real) ────────────────────────────────────────
  const stateData = useMemo(() => {
    const map = {};
    contacts.forEach(c => { if (c.state) map[c.state] = (map[c.state] || 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([state, leads]) => ({ state, leads }));
  }, [contacts]);

  // ── Funil de status (real) ─────────────────────────────────────────────────
  const statusLabels = {
    novo: 'Novo', contato_feito: 'Contato', interessado: 'Interessado',
    proposta_enviada: 'Proposta', fechado: 'Fechado', atendimento_humano: 'Humano', inativo: 'Inativo',
  };
  const funnelData = useMemo(() => {
    const map = {};
    contacts.forEach(c => { const s = c.status || 'novo'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(statusLabels)
      .map(([k, label]) => ({ status: label, count: map[k] || 0 }))
      .filter(d => d.count > 0);
  }, [contacts]);

  // ── Área de interesse (real) ───────────────────────────────────────────────
  const interestData = useMemo(() => {
    const map = {};
    contacts.forEach(c => { const a = c.interest_area || 'nenhum'; map[a] = (map[a] || 0) + 1; });
    const labels = {
      regularizacao_cnpj: 'Reg. CNPJ',
      contas_2025: 'Contas 2025',
      ambos: 'Ambos',
      outros: 'Outros',
    };
    return Object.entries(labels)
      .map(([k, name]) => ({ name, value: map[k] || 0 }))
      .filter(d => d.value > 0);
  }, [contacts]);

  // ── Radar de performance (real) ───────────────────────────────────────────
  const radarData = useMemo(() => {
    const abertura = openRate ? Math.min(parseFloat(openRate), 100) : 0;
    const clique = clickRate ? Math.min(parseFloat(clickRate) * 5, 100) : 0; // escalar p/ 0-100
    const conversao = convRate ? Math.min(parseFloat(convRate) * 10, 100) : 0;
    const engajamento = contacts.length > 0
      ? Math.min((contacts.filter(c => c.emails_opened_count > 0).length / contacts.length) * 100, 100)
      : 0;
    const retencao = contacts.length > 0
      ? Math.min((contacts.filter(c => ['interessado', 'proposta_enviada', 'fechado'].includes(c.status)).length / contacts.length) * 100, 100)
      : 0;
    const whatsapp = contacts.length > 0
      ? Math.min((contacts.filter(c => c.source === 'whatsapp' || (c.whatsapp_conversation || []).length > 0).length / contacts.length) * 100, 100)
      : 0;
    return [
      { subject: 'Abertura', A: +abertura.toFixed(0) },
      { subject: 'Cliques', A: +clique.toFixed(0) },
      { subject: 'Conversão', A: +conversao.toFixed(0) },
      { subject: 'Engajamento', A: +engajamento.toFixed(0) },
      { subject: 'Retenção', A: +retencao.toFixed(0) },
      { subject: 'WhatsApp', A: +whatsapp.toFixed(0) },
    ];
  }, [contacts, openRate, clickRate, convRate]);

  // ── Interesse CNPJ vs Contas ───────────────────────────────────────────────
  const cnpjCount = contacts.filter(c => ['regularizacao_cnpj', 'ambos'].includes(c.interest_area)).length;
  const contasCount = contacts.filter(c => ['contas_2025', 'ambos'].includes(c.interest_area)).length;
  const compData = [
    { name: 'Reg. CNPJ', leads: cnpjCount },
    { name: 'Contas 2025', leads: contasCount },
  ];

  if (loading) {
    return (
      <div className="p-5 lg:p-7 space-y-4 animate-fade-in">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-7 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-playfair text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm">Performance real da campanha eleitoral 2026 · {contacts.length.toLocaleString('pt-BR')} contatos · {campaigns.length} campanhas</p>
      </div>

      {/* KPIs reais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="E-mails Enviados" value={totalSent.toLocaleString('pt-BR')} sub={`${campaigns.filter(c => c.total_sent > 0).length} campanhas`} color="bg-navy/10 text-navy" icon={Mail} />
        <StatCard label="Taxa de Abertura" value={openRate ? `${openRate}%` : '—'} sub={totalOpened > 0 ? `${totalOpened.toLocaleString()} abertos` : 'Sem dados'} color="bg-gold/10 text-gold" icon={Percent} />
        <StatCard label="Taxa de Cliques" value={clickRate ? `${clickRate}%` : '—'} sub={totalClicked > 0 ? `${totalClicked.toLocaleString()} cliques` : 'Sem dados'} color="bg-success/10 text-success" icon={MousePointer} />
        <StatCard label="Convertidos" value={converted.toLocaleString('pt-BR')} sub={convRate ? `${convRate}% da base` : `de ${contacts.length} contatos`} color="bg-primary/10 text-primary" icon={Target} />
      </div>

      {/* Linha 2: Campanha + Radar */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Performance por campanha */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Taxa de Abertura por Campanha</h3>
          <p className="text-xs text-muted-foreground mb-4">Últimas campanhas enviadas</p>
          {campaignPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={campaignPerf} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: 11, border: '1px solid hsl(var(--border))' }}
                  formatter={(v, name) => [`${v}%`, name === 'abertura' ? 'Abertura' : 'Clique']}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={v => v === 'abertura' ? 'Abertura %' : 'Clique %'} />
                <Bar dataKey="abertura" fill="hsl(222,65%,28%)" radius={[4, 4, 0, 0]} name="abertura" />
                <Bar dataKey="clique_pct" fill="hsl(38,75%,52%)" radius={[4, 4, 0, 0]} name="clique_pct" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="Nenhuma campanha enviada ainda" />
          )}
        </div>

        {/* Radar de performance */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Índice de Performance</h3>
          <p className="text-xs text-muted-foreground mb-4">Calculado da base real de contatos e campanhas</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
              <Radar name="Performance" dataKey="A" stroke="hsl(222,65%,28%)" fill="hsl(222,65%,28%)" fillOpacity={0.25} />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Linha 3: Funil + Interesse */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Funil real */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Funil de Conversão</h3>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 11, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" fill="hsl(222,65%,28%)" radius={[0, 4, 4, 0]} name="Contatos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="Nenhum contato cadastrado ainda" />
          )}
        </div>

        {/* Interesse real */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Área de Interesse</h3>
          <p className="text-xs text-muted-foreground mb-4">Contatos por serviço de interesse</p>
          {interestData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={interestData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {interestData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: 11 }}
                    formatter={(v, name) => [`${v} contatos`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {interestData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState label="Sem dados de interesse mapeados" />
          )}
        </div>
      </div>

      {/* Linha 4: CNPJ vs Contas + Por Estado */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* CNPJ vs Contas */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <BarChart2 size={14} /> Demanda: CNPJ vs Contas 2025
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Contatos com interesse por serviço (podendo haver sobreposição)</p>
          {(cnpjCount > 0 || contasCount > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={compData} barSize={56}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 11, border: '1px solid hsl(var(--border))' }} formatter={v => [`${v} contatos`]} />
                  <Bar dataKey="leads" radius={[6, 6, 0, 0]}>
                    <Cell fill="hsl(222,65%,28%)" />
                    <Cell fill="hsl(38,75%,52%)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-around mt-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-navy">{cnpjCount}</p>
                  <p className="text-[11px] text-muted-foreground">Interesse CNPJ</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-xl font-bold text-gold">{contasCount}</p>
                  <p className="text-[11px] text-muted-foreground">Interesse Contas</p>
                </div>
              </div>
            </>
          ) : (
            <EmptyState label="Nenhum interesse mapeado ainda" />
          )}
        </div>

        {/* Por estado */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Contatos por Estado</h3>
          {stateData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stateData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="state" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 11 }} formatter={v => [`${v} contatos`]} />
                <Bar dataKey="leads" fill="hsl(222,65%,28%)" radius={[4, 4, 0, 0]} name="Contatos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="Nenhum contato com estado cadastrado" />
          )}
        </div>
      </div>

      {/* Linha 5: Engajamento por campanha detalhado */}
      {campaignPerf.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Volume de Envios por Campanha</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={campaignPerf}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 11, border: '1px solid hsl(var(--border))' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="enviados" fill="hsl(222,65%,28%)" radius={[4, 4, 0, 0]} name="Enviados" />
              <Bar dataKey="abertos" fill="hsl(38,75%,52%)" radius={[4, 4, 0, 0]} name="Abertos" />
              <Bar dataKey="cliques" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} name="Cliques" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}