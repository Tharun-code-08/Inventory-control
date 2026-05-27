import { useEffect } from 'react';
import { setDocumentTitlePageOverride } from '@/lib/document-title-override';

export function useDocumentTitleOverride(pageTitle?: string) {
  useEffect(() => {
    setDocumentTitlePageOverride(pageTitle);
    return () => setDocumentTitlePageOverride(undefined);
  }, [pageTitle]);
}
