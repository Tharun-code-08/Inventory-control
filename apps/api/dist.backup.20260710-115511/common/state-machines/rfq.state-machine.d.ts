import { DocumentStatus } from '@prisma/client';
import { RfqAction } from './document-actions';
export declare const RFQ_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]>;
export declare const RFQ_ACTIONS: Record<RfqAction, DocumentStatus[]>;
