import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
// Add page imports here
import CadastrarContato from '@/pages/CadastrarContato';
import Unsubscribe from '@/pages/Unsubscribe';
import Dashboard from '@/pages/Dashboard';
import Contacts from '@/pages/Contacts';
import Campaigns from '@/pages/Campaigns';
import Automations from '@/pages/Automations';
import AIAgent from '@/pages/AIAgent';
import Forms from '@/pages/Forms';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import WhatsAppHub from '@/pages/WhatsAppHub';
import WhatsappCampaigns from '@/pages/WhatsappCampaigns';

const PublicRoutes = () => (
  <Routes>
    <Route path="/cadastrar-contato" element={<CadastrarContato />} />
  </Routes>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">LegalTech Partidária 2026</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/ai-agent" element={<AIAgent />} />
        <Route path="/forms" element={<Forms />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/whatsapp" element={<WhatsAppHub />} />
        <Route path="/whatsapp-campaigns" element={<WhatsappCampaigns />} />
      </Route>
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="/cadastrar-contato" element={<CadastrarContato />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          {window.location.pathname === '/cadastrar-contato' ? <PublicRoutes /> : <AuthenticatedApp />}
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App