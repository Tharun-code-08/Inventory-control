import { DocumentStatus } from '@prisma/client';
import { RfqAction } from './document-actions';

/** Allowed persisted status transitions for RFQs. */
export const RFQ_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  [DocumentStatus.DRAFT]: [DocumentStatus.POSTED],
  [DocumentStatus.POSTED]: [],
};

/** Statuses in which each business action is permitted. */
export const RFQ_ACTIONS: Record<RfqAction, DocumentStatus[]> = {
  [RfqAction.EDIT]: [DocumentStatus.DRAFT],
  [RfqAction.POST]: [DocumentStatus.DRAFT],
  [RfqAction.SEND]: [DocumentStatus.POSTED],
  [RfqAction.CREATE_PO]: [DocumentStatus.POSTED],
};
