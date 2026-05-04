import { useState, useEffect } from 'react';
import { Bell, X, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PushNotificationBanner() {
  const [visible, setVisible] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (!('Notification' in window)) return;
    const perm = Notification.permission;
    setPermission(perm);
    // Show banner only if not yet decided
    const dismissed = localStorage.getItem('push-banner-dismissed');
    if (perm === 'default' && !dismissed) {
      setVisible(true);
    }
  }, []);

  const handleAllow = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    setVisible(false);
    if (result === 'granted') {
      new Notification('✅ Notificações ativadas!', {
        body: 'Você será alertado sobre novos leads urgentes e prazos eleitorais.',
        icon: '/favicon.ico',
      });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push-banner-dismissed', '1');
    setVisible(false);
  };

  if (!visible || permission === 'granted' || permission === 'denied') return null;

  return (
    <div className="bg-navy text-white rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
      <div className="w-8 h-8 bg-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <BellRing size={15} className="text-gold animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">Ativar Notificações de Prazos</p>
        <p className="text-[10px] text-white/60 mt-0.5">Receba alertas sobre leads urgentes e prazos eleitorais de 2026</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={handleAllow}
          className="h-7 text-[11px] bg-gold text-navy-dark font-semibold hover:bg-gold/90 px-3"
        >
          <Bell size={11} className="mr-1" /> Ativar
        </Button>
        <button onClick={handleDismiss} className="p-1 hover:bg-white/10 rounded transition-colors">
          <X size={13} className="text-white/60" />
        </button>
      </div>
    </div>
  );
}