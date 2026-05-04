import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Mail, Zap, MessageSquare, FileText,
  BarChart3, Settings, Menu, Scale, Bell, ChevronRight, Phone, LogOut
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/contacts', label: 'Contatos', icon: Users },
  { path: '/campaigns', label: 'Campanhas', icon: Mail },
  { path: '/automations', label: 'Automações', icon: Zap },
  { path: '/ai-agent', label: 'Agente IA', icon: MessageSquare, badge: 'NOVO' },
  { path: '/whatsapp', label: 'WhatsApp Hub', icon: Phone, badge: 'LIVE' },
  { path: '/forms', label: 'Formulários', icon: FileText },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const { data: contactCount = 0 } = useQuery({
    queryKey: ['contacts-total'],
    queryFn: async () => {
      const all = await base44.entities.Contact.list('-created_date', 5000);
      return all.length;
    },
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-navy-dark flex flex-col
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-gold rounded-lg flex items-center justify-center shadow-lg">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-playfair text-white font-bold text-sm leading-tight">LegalTech</p>
              <p className="text-white/40 text-[10px] uppercase tracking-widest">Partidária 2026</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-all duration-150
                  ${active
                    ? 'bg-white/10 text-white'
                    : 'text-white/55 hover:text-white hover:bg-white/7'
                  }
                `}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-gold' : ''}`} size={18} />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    item.badge === 'NOVO' ? 'bg-gold/20 text-gold' :
                    item.badge === 'LIVE' ? 'bg-green-500/20 text-green-400' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {item.path === '/contacts' && contactCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-white/10 text-white/50">
                    {contactCount.toLocaleString('pt-BR')}
                  </span>
                )}
                {active && <ChevronRight className="w-3 h-3 text-gold" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom user info */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-gold rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.full_name || 'Usuário'}</p>
              <p className="text-white/40 text-[10px] capitalize">{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Sair"
            >
              <LogOut size={14} className="text-white/40 hover:text-white/70" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-card border-b border-border flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="w-4.5 h-4.5 text-muted-foreground" size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-gold rounded-full" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}