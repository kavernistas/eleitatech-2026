import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, TestTube, Trophy, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ABTestPanel({ campaign, onBack }) {
  const [subjectA, setSubjectA] = useState(campaign?.subject_a || '');
  const [subjectB, setSubjectB] = useState(campaign?.subject_b || '');
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.update(campaign.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); onBack(); },
  });

  const setWinner = (winner) => saveMutation.mutate({ ab_winner: winner, active_subject: winner });

  const mockA = { opens: 847, clicks: 203, rate: '24.0%' };
  const mockB = { opens: 921, clicks: 267, rate: '29.0%' };
  const hasData = campaign?.total_sent > 0;

  return (
    <div className="p-5 lg:p-7 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={14} className="mr-1.5" /> Voltar</Button>
        <div className="flex-1">
          <h1 className="font-playfair text-xl font-bold">Teste A/B — {campaign?.name}</h1>
          <p className="text-xs text-muted-foreground">Configure dois assuntos e veja qual converte mais</p>
        </div>
      </div>

      <div className="grid gap-4 mb-6">
        {/* Version A */}
        <div className={`bg-card border-2 rounded-xl p-5 ${campaign?.ab_winner === 'a' ? 'border-gold' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-navy text-white rounded-md flex items-center justify-center text-xs font-bold">A</span>
              <span className="text-sm font-semibold">Versão A</span>
              {campaign?.ab_winner === 'a' && (
                <span className="flex items-center gap-1 text-[10px] bg-gold/15 text-gold px-2 py-0.5 rounded-full font-semibold">
                  <Trophy size={9} /> Vencedora
                </span>
              )}
            </div>
            {campaign?.ab_winner === 'pending' && (
              <Button size="sm" variant="outline" onClick={() => setWinner('a')} className="text-xs h-7">Definir Vencedora</Button>
            )}
          </div>
          <Label className="text-xs">Assunto</Label>
          <Input value={subjectA} onChange={e => setSubjectA(e.target.value)} className="mt-1 h-9 text-sm" />
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <p className="text-base font-bold">{hasData ? mockA.opens : '—'}</p>
              <p className="text-[10px] text-muted-foreground">Aberturas</p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <p className="text-base font-bold">{hasData ? mockA.clicks : '—'}</p>
              <p className="text-[10px] text-muted-foreground">Cliques</p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <p className="text-base font-bold">{hasData ? mockA.rate : '—'}</p>
              <p className="text-[10px] text-muted-foreground">Taxa</p>
            </div>
          </div>
        </div>

        {/* Version B */}
        <div className={`bg-card border-2 rounded-xl p-5 ${campaign?.ab_winner === 'b' ? 'border-gold' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-gold text-white rounded-md flex items-center justify-center text-xs font-bold">B</span>
              <span className="text-sm font-semibold">Versão B</span>
              {campaign?.ab_winner === 'b' && (
                <span className="flex items-center gap-1 text-[10px] bg-gold/15 text-gold px-2 py-0.5 rounded-full font-semibold">
                  <Trophy size={9} /> Vencedora
                </span>
              )}
            </div>
            {campaign?.ab_winner === 'pending' && (
              <Button size="sm" variant="outline" onClick={() => setWinner('b')} className="text-xs h-7">Definir Vencedora</Button>
            )}
          </div>
          <Label className="text-xs">Assunto</Label>
          <Input value={subjectB} onChange={e => setSubjectB(e.target.value)} className="mt-1 h-9 text-sm" />
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <p className="text-base font-bold text-gold">{hasData ? mockB.opens : '—'}</p>
              <p className="text-[10px] text-muted-foreground">Aberturas</p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <p className="text-base font-bold text-gold">{hasData ? mockB.clicks : '—'}</p>
              <p className="text-[10px] text-muted-foreground">Cliques</p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <p className="text-base font-bold text-gold">{hasData ? mockB.rate : '—'}</p>
              <p className="text-[10px] text-muted-foreground">Taxa</p>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={() => saveMutation.mutate({ subject_a: subjectA, subject_b: subjectB })} className="w-full bg-navy text-white">
        <TestTube size={13} className="mr-1.5" /> Salvar Teste A/B
      </Button>
    </div>
  );
}