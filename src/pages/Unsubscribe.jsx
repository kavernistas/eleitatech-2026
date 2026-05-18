import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Unsubscribe() {
  const [status, setStatus] = useState('loading'); // loading | success | error | notfound
  const [email, setEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('e');
    if (!encoded) { setStatus('error'); return; }

    let decoded;
    try { decoded = atob(encoded); } catch { setStatus('error'); return; }
    setEmail(decoded);

    base44.entities.Contact.filter({ email: decoded }, '-created_date', 1)
      .then(results => {
        if (!results || results.length === 0) { setStatus('notfound'); return; }
        const contact = results[0];
        return base44.entities.Contact.update(contact.id, { email_valid: false, status: 'inativo' });
      })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-12 h-12 bg-[#1a3a6b] rounded-xl flex items-center justify-center">
            <Mail size={22} className="text-white" />
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Marcos Eduardo</p>
          <p className="text-[11px] text-gray-400">Assessoria em Contabilidade Eleitoral</p>
        </div>

        {status === 'loading' && (
          <>
            <Loader2 size={32} className="animate-spin text-[#1a3a6b] mx-auto" />
            <p className="text-gray-600 text-sm">Processando sua solicitação…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={40} className="text-green-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-800">Descadastrado com sucesso</h1>
            <p className="text-gray-500 text-sm">
              O endereço <strong>{email}</strong> foi removido da nossa lista de envios.
              Você não receberá mais e-mails de marketing deste escritório.
            </p>
            <p className="text-xs text-gray-400 pt-2">
              Se isso foi um engano, entre em contato pelo e-mail{' '}
              <a href="mailto:contato@marcoseduardocontabil.com.br" className="underline text-[#1a3a6b]">
                contato@marcoseduardocontabil.com.br
              </a>
            </p>
          </>
        )}

        {status === 'notfound' && (
          <>
            <XCircle size={40} className="text-yellow-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-800">E-mail não encontrado</h1>
            <p className="text-gray-500 text-sm">
              O endereço <strong>{email}</strong> não foi localizado em nossa base.
              É possível que já esteja descadastrado.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} className="text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-gray-800">Link inválido</h1>
            <p className="text-gray-500 text-sm">
              O link de descadastramento é inválido ou expirou.
              Entre em contato diretamente pelo e-mail abaixo.
            </p>
            <a href="mailto:contato@marcoseduardocontabil.com.br" className="text-sm text-[#1a3a6b] underline">
              contato@marcoseduardocontabil.com.br
            </a>
          </>
        )}
      </div>
    </div>
  );
}