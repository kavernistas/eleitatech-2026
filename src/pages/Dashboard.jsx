import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Users, Mail, MousePointer, TrendingUp,
  Scale, Clock, AlertTriangle, CheckCircle2,
  BarChart3, Send, Wifi, WifiOff, ExternalLink
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import KpiCard from '@/components/dashboard/KpiCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import Countdown2026 from '@/components/dashboard/Countdown2026';
import UrgentActions from '@/components/dashboard/UrgentActions';
import PushNotificationBanner from '@/components/dashboard/PushNotificationBanner';
import EvolutionStatus from '@/components/dashboard/EvolutionStatus';

const INTEREST_COLORS = {
  regularizacao_cnpj: 'hsl(222,65%,28%)',
  contas_2025: 'hsl(38,75%,52%)',
  ambos: 'hsl(142,71%,45%)',
  outros: 'hsl(220,10%,55%)',
  nenhum: 'hsl(220,15%,80%)',
};

const STATUS_LABELS = {
  novo: 'Novo',
  contato_feito: 'Contato',
  interessado: 'Interessado',
  proposta_enviada: 'Proposta',
  fechado: 'Fechado',
  atendimento_humano: 'Humano',
  inativo: 'Inativo',
};

export default function Dashboard() {
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-dashboard'],
    queryFn: async () => {
      const pageSize = 500;
      let all = [];
      let page = 0;
      while (true) {
        const batch = await base44.entities.Contact.list('-created_date', pageSize, page * pageSize);
        all = all.concat(batch);
        if (batch.length < pageSize) break;
        page++;
      }
      return all;
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-dashboard'],
    queryFn: () => base44.entities.Campaign.list('-created_date', 100),
  });

  // Real KPIs from database
  const totalSent = campaigns.reduce((s, c) => s + (c.total_sent || 0), 0);
  const totalOpened = campaigns.reduce((s, c) => s + (c.total_opened || 0), 0);
  const totalClicked = campaigns.reduce((s, c) => s + (c.total_clicked || 0), 0);
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '—';
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '—';
  const humanAlert = contacts.filter(c => c.status === 'atendimento_humano').length;

  // Real interest distribution
  const interestCounts = contacts.reduce((acc, c) => {
    const area = c.interest_area || 'nenhum';
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});
  const totalWithInterest = Object.entries(interestCounts)
    .filter(([k]) => k !== 'nenhum')
    .reduce((s, [, v]) => s + v, 0) || 1;

  const interestData = Object.entries(interestCounts)
    .filter(([k, v]) => k !== 'nenhum' && v > 0)
    .map(([key, value]) => ({
      name: key === 'regularizacao_cnpj' ? 'Regularização CNPJ'
        : key === 'contas_2025' ? 'Contas 2025'
        : key === 'ambos' ? 'Ambos'
        : 'Outros',
      value: Math.round((value / totalWithInterest) * 100),
      color: INTEREST_COLORS[key] || INTEREST_COLORS.outros,
    }));

  // Real funnel data
  const statusCounts = contacts.reduce((acc, c) => {
    const s = c.status || 'novo';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(STATUS_LABELS)
    .map(([key, label]) => ({ status: label, count: statusCounts[key] || 0 }))
    .filter(d => d.count > 0);

  // Weekly engagement from campaigns (last 7 campaigns as proxy)
  const recentCampaigns = campaigns.slice(0, 7).reverse();
  const areaData = recentCampaigns.length > 0
    ? recentCampaigns.map((c, i) => ({
        day: c.name?.substring(0, 6) || `Camp ${i + 1}`,
        aberturas: c.total_opened || 0,
        cliques: c.total_clicked || 0,
      }))
    : [{ day: 'Sem dados', aberturas: 0, cliques: 0 }];

  return (
    <div className="p-5 lg:p-7 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Eleições 2026 · {contacts.length} contatos ativos</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/cadastrar-contato"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-navy text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-navy/90 transition-colors"
          >
            <ExternalLink size={12} />
            Cadastrar no LegalTech
          </a>
          <div className="flex items-center gap-2 bg-success/10 text-success px-3 py-1.5 rounded-full text-xs font-semibold">
            <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            Sistema Ativo
          </div>
        </div>
      </div>

      {/* Push Notification Banner */}
      <PushNotificationBanner />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Contatos"
          value={contacts.length > 0 ? contacts.length.toLocaleString('pt-BR') : '0'}
          subtitle="Partidos políticos"
          icon={Users}
          color="primary"
        />
        <KpiCard
          title="Taxa de Abertura"
          value={openRate !== '—' ? `${openRate}%` : '—'}
          subtitle={totalSent > 0 ? `${totalOpened.toLocaleString()} abertos` : 'Sem campanhas enviadas'}
          icon={Mail}
          color="gold"
        />
        <KpiCard
          title="Taxa de Cliques"
          value={clickRate !== '—' ? `${clickRate}%` : '—'}
          subtitle={totalSent > 0 ? `${totalClicked.toLocaleString()} cliques` : 'Sem campanhas enviadas'}
          icon={MousePointer}
          color="success"
        />
        <KpiCard
          title="Aguardando Humano"
          value={humanAlert.toString()}
          subtitle="Requerem atenção imediata"
          icon={AlertTriangle}
          color="warning"
        />
      </div>

      {/* Evolution API Status */}
      <EvolutionStatus />

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Engajamento por Campanha</h3>
              <p className="text-xs text-muted-foreground">Aberturas e cliques (últimas campanhas)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-navy inline-block" />Aberturas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gold inline-block" />Cliques</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="colorAb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(222,65%,28%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(222,65%,28%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38,75%,52%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(38,75%,52%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              <Area type="monotone" dataKey="aberturas" stroke="hsl(222,65%,28%)" fill="url(#colorAb)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="cliques" stroke="hsl(38,75%,52%)" fill="url(#colorCl)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-1">Área de Interesse</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribuição real dos leads</p>
          {interestData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={interestData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {interestData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {interestData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </span>
                    <span className="font-semibold text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-xs">
              <BarChart3 size={24} className="mb-2 opacity-30" />
              <p>Sem dados de interesse ainda</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Funnel */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Funil de Conversão Real</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" fill="hsl(222,65%,28%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-xs">
              <Users size={24} className="mb-2 opacity-30" />
              <p>Nenhum contato cadastrado ainda</p>
            </div>
          )}
        </div>

        {/* Activity + Countdown + Urgent */}
        <div className="space-y-4">
          <Countdown2026 />
          <UrgentActions />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}