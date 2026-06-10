import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function BackupCodesCard({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      toast.success('Backup codes copied.');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy backup codes.');
    }
  };

  const downloadCodes = () => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'softdigitims-backup-codes.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-950 p-5 shadow-inner">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {codes.map((code, index) => (
            <div key={code} className="flex items-center gap-3">
              <span className="w-5 text-[10px] font-bold text-slate-500">
                {String(index + 1).padStart(2, '0')}
              </span>
              <code className="text-sm tracking-[0.18em] text-slate-100">{code}</code>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="outline" className="flex-1" onClick={copyCodes}>
          {copied ? 'Copied' : 'Copy codes'}
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={downloadCodes}>
          Download
        </Button>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Store these codes safely. Each backup code works only once if you lose access to your
        authenticator app.
      </div>
    </div>
  );
}

export default BackupCodesCard;
