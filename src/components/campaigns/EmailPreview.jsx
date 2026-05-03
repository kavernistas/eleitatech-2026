const SAMPLE_CONTACT = {
  nome_responsavel: 'João Carlos',
  nome_partido: 'Partido dos Trabalhadores',
  sigla_partido: 'PT',
  cidade: 'São Paulo',
  estado: 'SP',
};

function resolvePlaceholders(text, contact) {
  return text
    .replace(/\{\{nome_responsavel\}\}/g, contact.nome_responsavel)
    .replace(/\{\{nome_contato\}\}/g, contact.nome_responsavel)
    .replace(/\{\{nome_partido\}\}/g, contact.nome_partido)
    .replace(/\{\{partido_nome\}\}/g, contact.nome_partido)
    .replace(/\{\{sigla_partido\}\}/g, contact.sigla_partido)
    .replace(/\{\{partido_sigla\}\}/g, contact.sigla_partido)
    .replace(/\{\{cidade\}\}/g, contact.cidade)
    .replace(/\{\{estado\}\}/g, contact.estado);
}

function renderBlock(block) {
  const content = resolvePlaceholders(block.content || '', SAMPLE_CONTACT);

  if (block.type === 'header') {
    return (
      <h1 key={block.id} style={{ fontFamily: 'Georgia,serif', color: '#1e3a5f', fontSize: '22px', fontWeight: 700, margin: '0 0 12px 0', lineHeight: 1.3 }}>
        {content}
      </h1>
    );
  }
  if (block.type === 'subheader') {
    return (
      <h2 key={block.id} style={{ fontFamily: 'Arial,sans-serif', color: '#2d4a7a', fontSize: '16px', fontWeight: 600, margin: '0 0 10px 0' }}>
        {content}
      </h2>
    );
  }
  if (block.type === 'text') {
    return (
      <p key={block.id} style={{ fontFamily: 'Arial,sans-serif', color: '#374151', fontSize: '14px', lineHeight: '1.75', margin: '0 0 14px 0', whiteSpace: 'pre-wrap' }}>
        {content}
      </p>
    );
  }
  if (block.type === 'divider') {
    return <hr key={block.id} style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />;
  }
  if (block.type === 'button') {
    const url = resolvePlaceholders(block.url || '#', SAMPLE_CONTACT);
    return (
      <div key={block.id} style={{ textAlign: 'center', margin: '20px 0' }}>
        <a
          href={url}
          style={{ display: 'inline-block', background: '#1e3a5f', color: '#fff', padding: '12px 32px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'Arial,sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '0.3px' }}
        >
          {content}
        </a>
      </div>
    );
  }
  if (block.type === 'image') {
    const url = block.url ? resolvePlaceholders(block.url, SAMPLE_CONTACT) : null;
    return url ? (
      <div key={block.id} style={{ margin: '12px 0' }}>
        <img src={url} alt={block.alt || ''} style={{ maxWidth: '100%', borderRadius: '6px' }} />
      </div>
    ) : null;
  }
  return null;
}

export default function EmailPreview({ subject, previewText, blocks, senderName }) {
  return (
    <div className="flex flex-col h-full">
      {/* Email client chrome */}
      <div className="bg-muted border border-border rounded-t-xl px-4 py-3 space-y-1 text-xs text-muted-foreground flex-shrink-0">
        <div className="flex gap-2">
          <span className="font-semibold text-foreground w-16">De:</span>
          <span>{senderName || 'Marcos - Escritório Jurídico'} &lt;marcos@escritorio.adv.br&gt;</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold text-foreground w-16">Para:</span>
          <span>João Carlos &lt;joao@pt-sp.org.br&gt;</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold text-foreground w-16">Assunto:</span>
          <span className="font-medium text-foreground">{resolvePlaceholders(subject || '(sem assunto)', SAMPLE_CONTACT)}</span>
        </div>
        {previewText && (
          <div className="flex gap-2">
            <span className="font-semibold text-foreground w-16">Prévia:</span>
            <span className="italic">{resolvePlaceholders(previewText, SAMPLE_CONTACT)}</span>
          </div>
        )}
      </div>

      {/* Email body */}
      <div className="flex-1 overflow-y-auto border border-t-0 border-border rounded-b-xl bg-[#f9fafb]">
        {/* Email wrapper */}
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }}>
          {/* Logo header */}
          <div style={{ background: '#1e3a5f', borderRadius: '10px 10px 0 0', padding: '20px 28px', marginBottom: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #c5991a, #e4b84a)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>⚖</span>
              </div>
              <div>
                <div style={{ color: '#fff', fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: '14px' }}>Escritório Jurídico</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' }}>Especialistas Eleitorais 2026</div>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div style={{ background: '#ffffff', padding: '28px', borderRadius: '0 0 0 0', minHeight: '200px' }}>
            {blocks.length === 0 ? (
              <p style={{ color: '#9ca3af', fontFamily: 'Arial,sans-serif', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>
                Adicione blocos no editor para visualizar o e-mail aqui.
              </p>
            ) : (
              blocks.map(renderBlock)
            )}
          </div>

          {/* Footer */}
          <div style={{ background: '#f3f4f6', borderRadius: '0 0 10px 10px', padding: '16px 28px', textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontFamily: 'Arial,sans-serif', fontSize: '11px', margin: '0 0 4px 0' }}>
              © 2026 Escritório Jurídico — Direito Eleitoral e Partidário
            </p>
            <p style={{ color: '#9ca3af', fontFamily: 'Arial,sans-serif', fontSize: '10px', margin: '0' }}>
              Você está recebendo este e-mail porque seu partido está em nossa base de contatos.{' '}
              <a href="#" style={{ color: '#1e3a5f' }}>Descadastrar</a>
            </p>
          </div>
        </div>
      </div>

      {/* Sample data note */}
      <p className="text-[10px] text-muted-foreground text-center mt-2 px-2">
        Prévia com dados de exemplo — João Carlos / PT / São Paulo-SP
      </p>
    </div>
  );
}