import { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';

const ELECTION_DATE = new Date('2026-10-04T00:00:00');

function getTimeLeft() {
  const now = new Date();
  const diff = ELECTION_DATE - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function Countdown2026() {
  const [time, setTime] = useState(getTimeLeft());

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  const units = [
    { label: 'Dias', value: time.days },
    { label: 'Horas', value: time.hours },
    { label: 'Min', value: time.minutes },
    { label: 'Seg', value: time.seconds },
  ];

  return (
    <div className="bg-gradient-to-br from-navy-dark to-navy rounded-xl p-5 text-white">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={16} className="text-gold" />
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">1° Turno Eleições 2026</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {units.map(({ label, value }) => (
          <div key={label} className="text-center bg-white/8 rounded-lg py-2.5 px-1">
            <p className="text-2xl font-bold font-mono leading-none">{String(value).padStart(2, '0')}</p>
            <p className="text-[10px] text-white/50 mt-1 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-white/40 mt-3 text-center">4 de outubro de 2026</p>
    </div>
  );
}