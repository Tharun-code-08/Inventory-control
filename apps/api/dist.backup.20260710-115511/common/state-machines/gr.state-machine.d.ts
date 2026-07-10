import { DocumentStatus } from '@prisma/client';
import { GrAction } from './document-actions';
export declare const GR_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]>;
export declare const GR_ACTIONS: Record<GrAction, DocumentStatus[]>;
