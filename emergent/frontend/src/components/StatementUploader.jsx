import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { parsePdfFile } from '../lib/pdfParser';
import { applyStatement } from '../lib/ledger';

export default function StatementUploader() {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf') {
      toast.error('Please choose a PDF statement');
      return;
    }
    setBusy(true);
    const pending = toast.loading('Parsing statement…');
    try {
      const parsed = await parsePdfFile(file);
      if (!parsed.transactions.length) {
        toast.error('No transactions found in that PDF', { id: pending });
        return;
      }
      applyStatement(parsed.transactions);
      toast.success(`Imported ${parsed.transactions.length} transactions`, { id: pending });
    } catch (error) {
      toast.error(error.message || 'Could not read that PDF', { id: pending });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <label
      className={`cb-card block cursor-pointer border-2 border-dashed p-6 transition ${over ? 'border-primary bg-primary/5' : 'border-border'}`}
      onDragOver={(event) => { event.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => { event.preventDefault(); setOver(false); handleFile(event.dataTransfer.files?.[0]); }}
    >
      <input ref={inputRef} type="file" accept="application/pdf" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold">Import from bank statement</div>
          <p className="mt-1 text-sm text-muted-foreground">Drop a PDF or click to browse</p>
        </div>
        <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>Browse PDF</Button>
      </div>
    </label>
  );
}
