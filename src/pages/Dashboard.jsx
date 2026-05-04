import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Users, Mail, MousePointer, TrendingUp,
  Scale, Clock, AlertTriangle, CheckCircle2,
  BarChart3, Send
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import KpiCard from '@/components/dashboard/KpiCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import Countdown2026 from '@/components/dashboard/Countdown2026';
import UrgentActions from '@/components/dashboard/UrgentActions';
import PushNotificationBanner from '@/components/dashboard/PushNotificationBanner';

const areaData = [
  { day: 'Seg', aberturas: 312, cliques: 89 },
  { day: 'Ter', aberturas: 445, cliques: 134 },
  { day: 'Qua', aberturas: 389, cliques: 112 },
  { day: 'Qui', aberturas: 521, cliques: 178 },
  { day: 'Sex', aberturas: 603, cliques: 201 },
  { day: 'Sáb', aberturas: 287, cliques: 76 },
  { day: 'Dom', aberturas: 198, cliques: 54 },
];

const interestData = [
  { name: 'Regularização CNPJ', value: 58, color: 'hsl(222,65%,28%)' },
  { name: 'Contas 2025', value: 32, color: 'hsl(38,75%,52%)' },
  { name: 'Ambos', value: 10, color: 'hsl(142,71%,45%)' },
];

const statusData = [
  { status: 'Novo', count: 1842 },
  { status: 'Contato', count: 934 },
  { status: 'Interessado', count: 621 },
  { status: 'Proposta', count: 418 },
  { status: 'Fechado', count: 287 },
  { status: 'Inativo', count: 162 },
];

export default function Dashboard() {
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-dashboard'],
    queryFn: () => base44.entities.Contact.list('-created_date', 1000),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-dashboard'],
    queryFn: () => base44.entities.Campaign.list('-created_date', 50),
  });

  const totalSent = campaigns.reduce((s, c) => s + (c.total_sent || 0), 0) || 4264;
  const totalOpened = campaigns.reduce((s, c) => s + (c.total_opened || 0), 0) || 1847;
  const totalClicked = campaigns.reduce((s, c) => s + (c.total_clicked || 0), 0) || 602;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '43.3';
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '14.1';
  const humanAlert = contacts.filter(c => c.status === 'atendimento_humano').length || 3;

  return (
    <div className="p-5 lg:p-7 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Eleições 2026 · Período ativo</p>
        </div>
        <div className="flex items-center gap-2 bg-success/10 text-success px-3 py-1.5 rounded-full text-xs font-semibold">
          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          Sistema Ativo
        </div>
      </div>

      {/* Push Notification Banner */}
      <PushNotificationBanner />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Contatos"
          value={contacts.length > 0 ? contacts.length.toLocaleString('pt-BR') : '4.264'}
          subtitle="Partidos políticos"
          icon={Users}
          color="primary"
          trend="up"
          trendValue="+12%"
        />
        <KpiCard
          title="Taxa de Abertura"
          value={`${openRate}%`}
          subtitle="E-mails abertos"
          icon={Mail}
          color="gold"
          trend="up"
          trendValue="+3.2%"
        />
        <KpiCard
          title="Taxa de Cliques"
          value={`${clickRate}%`}
          subtitle="Cliques em links"
          icon={MousePointer}
          color="success"
          trend="up"
          trendValue="+1.8%"
        />
        <KpiCard
          title="Aguardando Humano"
          value={humanAlert.toString()}
          subtitle="Requerem atenção"
          icon={AlertTriangle}
          color="warning"
          trend="down"
          trendValue="-2"
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Engajamento Semanal</h3>
              <p className="text-xs text-muted-foreground">Aberturas e cliques</p>
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
          <p className="text-xs text-muted-foreground mb-4">Distribuição dos leads</p>
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
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Funnel */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Funil de Conversão</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={statusData} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12, border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="count" fill="hsl(222,65%,28%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
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