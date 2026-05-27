import { useEffect, useReducer } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  DEFAULT_DOCUMENT_TITLE,
  resolveDocumentTitle,
} from '@/lib/page-titles';
import {
  getDocumentTitlePageOverride,
  setDocumentTitlePageOverride,
  subscribeDocumentTitlePageOverride,
} from '@/lib/document-title-override';

export function DocumentTitleManager() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [overrideVersion, bumpOverride] = useReducer((count: number) => count + 1, 0);

  useEffect(() => subscribeDocumentTitlePageOverride(() => bumpOverride()), []);

  useEffect(() => {
    document.title = resolveDocumentTitle(
      location.pathname,
      searchParams,
      getDocumentTitlePageOverride(),
    );
  }, [location.pathname, location.search, searchParams, overrideVersion]);

  useEffect(
    () => () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    },
    [],
  );

  return null;
}
