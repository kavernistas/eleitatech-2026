import { Mail, MapPin } from 'lucide-react';

export default function ContactCard({ contact, selected, statusColors, onClick }) {
  const initials = (contact.name || contact.email || '?').substring(0, 2).toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-muted/50 ${selected ? 'bg-primary/5 border-l-2 border-l-navy' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-navy/10 text-navy rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{contact.name || 'Sem nome'}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColors[contact.status] || 'bg-muted text-muted-foreground'}`}>
              {contact.status?.replace(/_/g, ' ') || 'novo'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{contact.party_name || contact.email}</p>
          <div className="flex items-center gap-3 mt-1">
            {contact.email && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Mail size={10} /> {contact.email}
              </span>
            )}
            {contact.city && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin size={10} /> {contact.city}
              </span>
            )}
          </div>
        </div>
      </div>
      {contact.tags && contact.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {contact.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded font-medium">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}