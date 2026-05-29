import { Download, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { downloadDocumentPdf, type DocumentPdfKind } from '@/lib/document-pdf';
import { useSendDocumentEmail } from '@/hooks/use-document-send';
import { getApiErrorMessage } from '@/lib/api-error';

type DocumentRowActionsProps = {
  kind: DocumentPdfKind;
  id: string;
  canSend?: boolean;
  resend?: boolean;
};

export function DocumentRowActions({
  kind,
  id,
  canSend = true,
  resend = true,
}: DocumentRowActionsProps) {
  const sendMut = useSendDocumentEmail(kind);

  const onDownload = async () => {
    try {
      await downloadDocumentPdf(kind, id);
      toast.success('PDF downloaded');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to download PDF'));
    }
  };

  const onSend = async () => {
    try {
      const result = await sendMut.mutateAsync({ id, resend });
      if (result?.sent) {
        toast.success(result?.message ?? 'Email sent with PDF attachment');
      } else if (result?.queued) {
        toast.message(result?.message ?? 'Email queued — PDF will be generated and sent shortly');
      } else {
        toast.success('Email request submitted');
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send email'));
    }
  };

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload} title="Download PDF">
        <Download className="h-4 w-4" />
      </Button>
      {canSend && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onSend}
          disabled={sendMut.isPending}
          title={resend ? 'Resend email' : 'Send email'}
        >
          <Mail className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
