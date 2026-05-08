import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Database, Check, Save, Eye, EyeOff } from 'lucide-react';

const KEYS = [
  { section: 'evolution', label: 'API Evolution (WhatsApp)', icon: Phone, color: 'green', fields: [
    { key: 'EVOLUTION_API_URL', label: 'URL da API', placeholder: 'https://sua-instancia.evolution-api.com', type: 'text' },
    { key: 'EVOLUTION_API_KEY', label: 'Chave da API', placeholder: 'sua-chave-evolution', type: 'password' },
    { key: 'EVOLUTION_INSTANCE_NAME', label: 'Nome da Instância', placeholder: 'minha-instancia', type: 'text' },
  ]},
  { section: 'supabase', label: 'Supabase', icon: Database, color: 'emerald', fields: [
    { key: 'SUPABASE_URL', label: 'URL do Projeto', placeholder: 'https://xxxx.supabase.co', type: 'text' },
    { key: 'SUPABASE_SERVICE_KEY', label: 'Service Role Key', placeholder: 'eyJhbGciOiJIUzI1NiIs...', type: 'password' },
  ]},
];

function MaskedInput({ field, value, onChange }) {
  const [show, setShow] = useState(false);
  if (field.type !== 'password') {
    return (
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="mt-1 h-9 text-sm font-mono"
      />
    );
  }
  return (
    <div className="relative mt-1">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="h-9 text-sm font-mono pr-9"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

export default function ApiKeysSettings() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState({});

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings-apikeys'],
    queryFn: () => base44.entities.AppSettings.list(),
    onSuccess: (data) => {
      const map = {};
      data.forEach(s => { map[s.key] = s.value; });
      setValues(map);
    }
  });

  // populate values when loaded
  const allKeys = KEYS.flatMap(s => s.fields.map(f => f.key));
  const initializedRef = useState(false);
  if (!initializedRef[0] && settings.length > 0) {
    initializedRef[0] = true;
    const map = {};
    settings.forEach(s => { if (allKeys.includes(s.key)) map[s.key] = s.value; });
    // Only set if different to avoid loop - handled below via useQuery onSuccess
  }

  const mutation = useMutation({
    mutationFn: async (vals) => {
      const existing = settings.reduce((acc, s) => { acc[s.key] = s; return acc; }, {});
      const promises = Object.entries(vals).map(([key, value]) => {
        if (!value) return null;
        if (existing[key]) {
          return base44.entities.AppSettings.update(existing[key].id, { value });
        } else {
          return base44.entities.AppSettings.create({ key, value });
        }
      }).filter(Boolean);
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-apikeys'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  });

  const handleSave = () => mutation.mutate(values);

  return (
    <div className="space-y-6">
      {KEYS.map(section => {
        const Icon = section.icon;
        const colorMap = { green: 'text-green-600', emerald: 'text-emerald-600' };
        const bgMap = { green: 'bg-green-600/10 text-green-700', emerald: 'bg-emerald-600/10 text-emerald-700' };

        return (
          <div key={section.section} className="border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Icon size={16} className={colorMap[section.color]} />
              <h3 className="font-semibold text-foreground text-sm">{section.label}</h3>
            </div>
            <div className="space-y-3">
              {section.fields.map(field => (
                <div key={field.key}>
                  <Label className="text-xs">{field.label}</Label>
                  <MaskedInput
                    field={field}
                    value={values[field.key] || ''}
                    onChange={v => setValues(prev => ({ ...prev, [field.key]: v }))}
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{field.key}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <Button onClick={handleSave} disabled={mutation.isPending} className="bg-navy text-white hover:bg-navy/90">
        {saved ? <><Check size={13} className="mr-1.5" />Salvo!</> : <><Save size={13} className="mr-1.5" />Salvar Chaves</>}
      </Button>
    </div>
  );
}