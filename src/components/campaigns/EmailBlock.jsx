import { Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WA_TEMPLATES = [
  {
    id: 'diagnostico',
    label: '💬 WhatsApp — Diagnóstico Gratuito',
    message: 'Olá, vim pelo e-mail sobre regularização do {{sigla_partido}} em {{cidade}}-{{estado}}. Gostaria de solicitar o diagnóstico gratuito.',
  },
  {
    id: 'contas',
    label: '💬 WhatsApp — Prestação de Contas',
    message: 'Olá, preciso de ajuda com a prestação de contas 2025 do {{sigla_partido}} em {{cidade}}-{{estado}}.',
  },
  {
    id: 'cnpj',
    label: '💬 WhatsApp — Regularização CNPJ',
    message: 'Olá, preciso regularizar o CNPJ do {{sigla_partido}} em {{cidade}}. Vi seu e-mail e gostaria de mais informações.',
  },
  {
    id: 'custom_wa',
    label: '💬 WhatsApp — Mensagem personalizada',
    message: '',
  },
];

const WA_NUMBER = ''; // número configurável via AppSettings (WHATSAPP_DEFAULT_NUMBER)

function buildWhatsAppUrl(number, message) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export default function EmailBlock({ block, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className="group relative bg-white border border-border rounded-lg hover:border-navy/40 transition-colors">
      {/* Drag handle + controls */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center justify-center w-8 opacity-0 group-hover:opacity-100 transition-opacity gap-1 px-1">
        <GripVertical size={12} className="text-muted-foreground cursor-grab" />
        {!isFirst && (
          <button onClick={onMoveUp} className="p-0.5 rounded hover:bg-muted">
            <ChevronUp size={10} className="text-muted-foreground" />
          </button>
        )}
        {!isLast && (
          <button onClick={onMoveDown} className="p-0.5 rounded hover:bg-muted">
            <ChevronDown size={10} className="text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="pl-8 pr-8 py-3">
        {block.type === 'header' && (
          <Input
            value={block.content}
            onChange={e => onChange('content', e.target.value)}
            className="text-lg font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-foreground"
            placeholder="Título do e-mail..."
          />
        )}
        {block.type === 'subheader' && (
          <Input
            value={block.content}
            onChange={e => onChange('content', e.target.value)}
            className="text-base font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-foreground"
            placeholder="Subtítulo..."
          />
        )}
        {block.type === 'text' && (
          <Textarea
            id={`block-textarea-${block.id}`}
            value={block.content}
            onChange={e => onChange('content', e.target.value)}
            className="border-none bg-transparent p-0 text-sm focus-visible:ring-0 resize-none min-h-[70px] text-foreground"
            placeholder="Digite seu texto aqui..."
          />
        )}
        {block.type === 'divider' && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-dashed border-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Divisor</span>
            <div className="flex-1 border-t border-dashed border-border" />
          </div>
        )}
        {block.type === 'button' && (
          <div className="space-y-2">
            {/* CTA type selector */}
            <Select
              value={block.cta_type || 'custom'}
              onValueChange={(val) => {
                if (val === 'custom') {
                  onChange('cta_type', 'custom');
                  onChange('url', '');
                } else {
                  const tpl = WA_TEMPLATES.find(t => t.id === val);
                  onChange('cta_type', val);
                  if (tpl && val !== 'custom_wa') {
                    onChange('url', buildWhatsAppUrl(WA_NUMBER, tpl.message));
                    onChange('wa_message', tpl.message);
                  } else if (val === 'custom_wa') {
                    onChange('url', buildWhatsAppUrl(WA_NUMBER, block.wa_message || ''));
                    onChange('wa_message', block.wa_message || '');
                  }
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tipo de CTA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">🔗 URL personalizada</SelectItem>
                {WA_TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Text + URL/WA fields */}
            <div className="flex gap-2">
              <Input
                value={block.content}
                onChange={e => onChange('content', e.target.value)}
                className="flex-1 h-8 text-sm"
                placeholder="Texto do botão"
              />
              {(!block.cta_type || block.cta_type === 'custom') && (
                <Input
                  value={block.url || ''}
                  onChange={e => onChange('url', e.target.value)}
                  className="flex-1 h-8 text-sm"
                  placeholder="URL (https://...)"
                />
              )}
            </div>

            {/* WhatsApp number + custom message */}
            {block.cta_type && block.cta_type !== 'custom' && (
              <div className="space-y-1.5 bg-green-50 border border-green-200 rounded-lg p-2.5">
                <Input
                  value={block.wa_number || WA_NUMBER}
                  onChange={e => {
                    const num = e.target.value;
                    onChange('wa_number', num);
                    onChange('url', buildWhatsAppUrl(num, block.wa_message || ''));
                  }}
                  className="h-7 text-xs font-mono"
                  placeholder="Número WhatsApp (ex: 5511999990000)"
                />
                <Textarea
                  value={block.wa_message || (WA_TEMPLATES.find(t => t.id === block.cta_type)?.message || '')}
                  onChange={e => {
                    onChange('wa_message', e.target.value);
                    onChange('url', buildWhatsAppUrl(block.wa_number || WA_NUMBER, e.target.value));
                  }}
                  className="text-xs resize-none min-h-[60px] bg-white"
                  placeholder="Mensagem do WhatsApp (pode usar placeholders como {{sigla_partido}}, {{cidade}})"
                />
                <p className="text-[10px] text-green-700 opacity-70">Placeholders como {'{{sigla_partido}}'}, {'{{cidade}}'} serão substituídos no envio.</p>
              </div>
            )}

            <div className="flex justify-center py-1">
              <span className={`inline-block text-white text-sm px-6 py-2 rounded-lg font-semibold pointer-events-none ${block.cta_type && block.cta_type !== 'custom' ? 'bg-green-600' : 'bg-navy'}`}>
                {block.content || 'Botão'}
              </span>
            </div>
          </div>
        )}
        {block.type === 'image' && (
          <div className="space-y-2">
            <Input
              value={block.url || ''}
              onChange={e => onChange('url', e.target.value)}
              className="h-8 text-sm"
              placeholder="URL da imagem (https://...)"
            />
            {block.url ? (
              <img src={block.url} alt="bloco" className="max-h-32 rounded object-cover w-full" />
            ) : (
              <div className="h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                Prévia da imagem aparecerá aqui
              </div>
            )}
            <Input
              value={block.alt || ''}
              onChange={e => onChange('alt', e.target.value)}
              className="h-8 text-xs"
              placeholder="Texto alternativo (acessibilidade)"
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}