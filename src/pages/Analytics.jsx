import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart2, MousePointer, Mail, TrendingUp, Map } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const weeklyData = [
  { week: 'S1 Abr', enviados: 4264, abertos: 1823, cliques: 512, respostas: 87 },
  { week: 'S2 Abr', enviados: 3800, abertos: 1956, cliques: 634, respostas: 112 },
  { week: 'S3 Abr', enviados: 4100, abertos: 2104, cliques: 718, respostas: 143 },
  { week: 'S4 Abr', enviados: 4264, abertos: 2387, cliques: 847, respostas: 198 },
  { week: 'S1 Mai', enviados: 4264, abertos: 2541, cliques: 921, respostas: 234 },
];

const clickMapData = [
  { service: 'Regularização CNPJ', clicks: 487, pct: 52.8 },
  { service: 'Prestação de Contas 2025', clicks: 298, pct: 32.3 },
  { service: 'Diagnóstico Gratuito', clicks: 201, pct: 21.8 },
  { service: 'Consultoria Eleitoral', clicks: 134, pct: 14.5 },
  { service: 'WhatsApp Direto', clicks: 89, pct: 9.7 },
];

const stateData = [
  { state: 'SP', leads: 834 }, { state: 'MG', leads: 612 },
  { state: 'RJ', leads: 498 }, { state: 'BA', leads: 387 },
  { state: 'RS', leads: 312 }, { state: 'PR', leads: 289 },
  { state: 'PE', leads: 245 }, { state: 'CE', leads: 198 },
];

const radarData = [
  { subject: 'Taxa Abertura', A: 86 },
  { subject: 'Taxa Cliques', A: 65 },
  { subject: 'Conversão', A: 45 },
  { subject: 'Engajamento', A: 72 },
  { subject: 'Retenção', A: 58 },
  { subject: 'Resposta', A: 38 },
];

export default function Analytics() {
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-analytics'],
    queryFn: () => base44.entities.Contact.list('-created_date', 1000),
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-analytics'],
    queryFn: () => base44.entities.Campaign.list('-created_date', 50),
  });

  const totalSent = campaigns.reduce((s, c) => s + (c.total_sent || 0), 0) || 21160;
  const totalOpened = campaigns.reduce((s, c) => s + (c.total_opened || 0), 0) || 10811;
  const totalClicked = campaigns.reduce((s, c) => s + (c.total_clicked || 0), 0) || 3632;
  const converted = contacts.filter(c => c.status === 'fechado').length || 287;

  return (
    <div className="p-5 lg:p-7 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-playfair text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm">Performance geral da campanha eleitoral 2026</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Enviados', value: totalSent.toLocaleString('pt-BR'), color: 'bg-navy/10 text-navy', icon: Mail },
          { label: 'Total Abertos', value: totalOpened.toLocaleString('pt-BR'), color: 'bg-gold/10 text-gold', icon: Mail },
          { label: 'Total Cliques', value: totalClicked.toLocaleString('pt-BR'), color: 'bg-success/10 text-success', icon: MousePointer },
          { label: 'Conversões', value: converted.toLocaleString('pt-BR'), color: 'bg-primary/10 text-primary', icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Weekly trend */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tendência Semanal</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="abertos" stroke="hsl(222,65%,28%)" strokeWidth={2} dot={false} name="Abertos" />
              <Line type="monotone" dataKey="cliques" stroke="hsl(38,75%,52%)" strokeWidth={2} dot={false} name="Cliques" />
              <Line type="monotone" dataKey="respostas" stroke="hsl(142,71%,45%)" strokeWidth={2} dot={false} name="Respostas" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Índice de Performance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
              <Radar name="Performance" dataKey="A" stroke="hsl(222,65%,28%)" fill="hsl(222,65%,28%)" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Click Map */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <MousePointer size={14} /> Mapa de Cliques por Serviço
        </h3>
        <div className="space-y-3">
          {clickMapData.map(item => (
            <div key={item.service} className="flex items-center gap-3">
              <p className="text-sm text-foreground w-48 flex-shrink-0">{item.service}</p>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full gradient-navy rounded-full transition-all duration-700" style={{ width: `${item.pct}%` }} />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground w-24 text-right">
                <span className="font-semibold text-foreground">{item.clicks}</span>
                <span>({item.pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By State */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Estado</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stateData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="state" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12 }} />
            <Bar dataKey="leads" fill="hsl(222,65%,28%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}