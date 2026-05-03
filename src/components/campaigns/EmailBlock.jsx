import { Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
            <div className="flex gap-2">
              <Input
                value={block.content}
                onChange={e => onChange('content', e.target.value)}
                className="flex-1 h-8 text-sm"
                placeholder="Texto do botão"
              />
              <Input
                value={block.url || ''}
                onChange={e => onChange('url', e.target.value)}
                className="flex-1 h-8 text-sm"
                placeholder="URL (https://...)"
              />
            </div>
            <div className="flex justify-center py-1">
              <span className="inline-block bg-navy text-white text-sm px-6 py-2 rounded-lg font-semibold pointer-events-none">
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