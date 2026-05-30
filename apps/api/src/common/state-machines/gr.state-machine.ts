import { DocumentStatus } from '@prisma/client';
import { GrAction } from './document-actions';

/** Allowed persisted status transitions for goods receipts. */
export const GR_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  [DocumentStatus.DRAFT]: [DocumentStatus.POSTED],
  [DocumentStatus.POSTED]: [],
};

/** Statuses in which each business action is permitted. */
export const GR_ACTIONS: Record<GrAction, DocumentStatus[]> = {
  [GrAction.EDIT]: [DocumentStatus.DRAFT],
  [GrAction.DELETE]: [DocumentStatus.DRAFT],
  [GrAction.POST]: [DocumentStatus.DRAFT],
  [GrAction.SEND]: [DocumentStatus.POSTED],
  [GrAction.CREATE_BILL]: [DocumentStatus.POSTED],
};
