import { Download, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DocumentEmailHistoryPanel } from '@/components/shared/DocumentEmailHistoryPanel';
import { downloadDocumentPdf, type DocumentPdfKind } from '@/lib/document-pdf';
import { useSendDocumentEmail } from '@/hooks/use-document-send';
import { useDocumentEmailHistory } from '@/hooks/use-document-email-history';
import { getApiErrorMessage } from '@/lib/api-error';

type DocumentDetailActionsProps = {
  kind: DocumentPdfKind;
  id: string;
  canSend?: boolean;
  resend?: boolean;
  showHistory?: boolean;
};

export function DocumentDetailActions({
  kind,
  id,
  canSend = true,
  resend = true,
  showHistory = true,
}: DocumentDetailActionsProps) {
  const sendMut = useSendDocumentEmail(kind);
  const emailHistoryQuery = useDocumentEmailHistory(kind, id);

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
        toast.success('Email sent with PDF attachment');
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        {canSend ? (
          <Button variant="outline" size="sm" onClick={onSend} disabled={sendMut.isPending}>
            <Send className="mr-2 h-4 w-4" />
            {sendMut.isPending ? 'Sending…' : resend ? 'Resend email' : 'Send email'}
          </Button>
        ) : null}
      </div>
      {showHistory ? (
        <DocumentEmailHistoryPanel
          summary={emailHistoryQuery.data?.summary}
          history={emailHistoryQuery.data?.history}
          isLoading={emailHistoryQuery.isLoading}
        />
      ) : null}
    </div>
  );
}
