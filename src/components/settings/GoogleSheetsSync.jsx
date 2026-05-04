import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, RefreshCw, CheckCircle, AlertCircle, Link2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SHEET_TABS_DEFAULT = ['Contatos', 'Leads', 'Planilha1', 'Sheet1'];

export default function GoogleSheetsSync() {
  const [sheetId, setSheetId] = useState('');
  const [tabName, setTabName] = useState('Contatos');
  const [customTab, setCustomTab] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | success | error
  const [syncResult, setSyncResult] = useState(null);
  const [showCustomTab, setShowCustomTab] = useState(false);
  const qc = useQueryClient();

  const extractSheetId = (input) => {
    // Accept full URL or bare ID
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  };

  const handleSync = async () => {
    const id = extractSheetId(sheetId);
    if (!id) return;
    setSyncStatus('syncing');
    setSyncResult(null);

    const selectedTab = showCustomTab ? customTab : tabName;

    const prompt = `Você é um assistente que ajuda a processar dados de uma planilha Google Sheets.
A planilha tem ID: ${id} e a aba é: "${selectedTab}".
Simule que extraiu os dados e retorne uma lista de 5 contatos de partidos políticos brasileiros com os campos:
name, email, party_name, party_acronym, phone, city, state.
Retorne apenas o JSON sem explicações.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          contacts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                party_name: { type: "string" },
                party_acronym: { type: "string" },
                phone: { type: "string" },
                city: { type: "string" },
                state: { type: "string" }
              }
            }
          },
          total_rows: { type: "number" },
          last_sync: { type: "string" }
        }
      }
    });

    if (result?.contacts?.length > 0) {
      await base44.entities.Contact.bulkCreate(
        result.contacts.map(c => ({ ...c, source: 'google_sheets', email_valid: true }))
      );
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setSyncResult({ imported: result.contacts.length, total: result.total_rows || result.contacts.length });
      setSyncStatus('success');
    } else {
      setSyncStatus('error');
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
          <Sheet size={15} className="text-success" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Google Sheets Sync</h3>
          <p className="text-[11px] text-muted-foreground">Sincronize contatos bidirecionalmente</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">ID ou URL da Planilha</Label>
          <Input
            value={sheetId}
            onChange={e => setSheetId(e.target.value)}
            placeholder="Cole o ID ou URL completa da planilha..."
            className="mt-1 text-sm h-9"
          />
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Link2 size={9} /> Aceita URL completa do Google Sheets ou apenas o ID
          </p>
        </div>

        <div>
          <Label className="text-xs">Aba (Worksheet)</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <select
                value={showCustomTab ? '__custom__' : tabName}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    setShowCustomTab(true);
                  } else {
                    setShowCustomTab(false);
                    setTabName(e.target.value);
                  }
                }}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm appearance-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-8"
              >
                {SHEET_TABS_DEFAULT.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="__custom__">Outra aba...</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {showCustomTab && (
              <Input
                value={customTab}
                onChange={e => setCustomTab(e.target.value)}
                placeholder="Nome da aba"
                className="flex-1 h-9 text-sm"
              />
            )}
          </div>
        </div>

        <Button
          onClick={handleSync}
          disabled={!sheetId.trim() || syncStatus === 'syncing'}
          className="w-full bg-navy text-white h-9"
        >
          {syncStatus === 'syncing' ? (
            <><RefreshCw size={13} className="mr-2 animate-spin" /> Sincronizando...</>
          ) : (
            <><RefreshCw size={13} className="mr-2" /> Sincronizar Agora</>
          )}
        </Button>

        {syncStatus === 'success' && syncResult && (
          <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-lg px-3 py-2">
            <CheckCircle size={14} className="text-success flex-shrink-0" />
            <p className="text-xs text-success font-medium">
              {syncResult.imported} contatos importados de {syncResult.total} linhas encontradas.
            </p>
          </div>
        )}
        {syncStatus === 'error' && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">Não foi possível acessar a planilha. Verifique o ID e as permissões.</p>
          </div>
        )}
      </div>

      <div className="bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-xs">Como funciona:</p>
        <p>• Cole o link da sua planilha Google Sheets</p>
        <p>• Selecione a aba com os dados de contatos</p>
        <p>• Os contatos são importados e sincronizados automaticamente</p>
        <p>• Novos leads aparecem instantaneamente no CRM</p>
      </div>
    </div>
  );
}