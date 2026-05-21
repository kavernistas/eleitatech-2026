import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const VARIABLES = [
  { label: '{{nome_responsavel}}', desc: 'Nome do responsável' },
  { label: '{{nome_partido}}', desc: 'Nome do partido' },
  { label: '{{sigla_partido}}', desc: 'Sigla do partido' },
  { label: '{{cidade}}', desc: 'Cidade' },
  { label: '{{estado}}', desc: 'Estado' },
];

export default function WhatsappCampaignForm({ campaign, onClose }) {
  const [name, setName] = useState(campaign?.name || '');
  const [message, setMessage] = useState(campaign?.message_template || '');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (campaign?.id) {
        return base44.entities.WhatsappCampaign.update(campaign.id, { name, message_template: message });
      }
      return base44.entities.WhatsappCampaign.create({ name, message_template: message, status: 'rascunho' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-campaigns'] });
      onClose();
    },
  });

  const insertVariable = (v) => setMessage(prev => prev + v);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-playfair">
            {campaign ? 'Editar Campanha' : 'Nova Campanha WhatsApp'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome da campanha</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Prospecção CNPJ - Maio 2026" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Mensagem</label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Digite a mensagem. Use as variáveis abaixo para personalizar."
              className="h-40 text-sm"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VARIABLES.map(v => (
                <button
                  key={v.label}
                  onClick={() => insertVariable(v.label)}
                  title={v.desc}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-navy/10 text-navy border border-navy/20 hover:bg-navy/20 transition-colors"
                >
                  {v.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Clique nas variáveis para inserir na mensagem.</p>
          </div>

          {/* Preview */}
          {message && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-[11px] text-green-700 font-semibold mb-1">Preview (exemplo)</p>
              <p className="text-sm text-green-900 whitespace-pre-wrap leading-relaxed">
                {message
                  .replace(/\{\{nome_responsavel\}\}/g, 'João Silva')
                  .replace(/\{\{nome_partido\}\}/g, 'Partido Democrático')
                  .replace(/\{\{sigla_partido\}\}/g, 'PD')
                  .replace(/\{\{cidade\}\}/g, 'São Paulo')
                  .replace(/\{\{estado\}\}/g, 'SP')}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={!name || !message || mutation.isPending}
              className="flex-1 bg-navy text-white"
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar Campanha'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}