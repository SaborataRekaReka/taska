import type { AiOperationDetail, AiOperationStatus, AiScope } from '../../lib/types';

export type AiAdminSection =
  | 'overview'
  | 'operations'
  | 'inspector'
  | 'my-day-policy'
  | 'prompt-rules'
  | 'safety'
  | 'logs';

export interface AiOperationView {
  operationId: string;
  createdAt: string;
  scope: AiScope;
  status: AiOperationStatus;
  planKind: 'GENERIC' | 'MY_DAY' | 'UNKNOWN';
  model: string | null;
  operationsCount: number;
  prompt: string;
  hasWarnings: boolean;
  isFallbackMyDay: boolean;
  source: AiOperationDetail;
}

export interface AiOperationMetrics {
  total: number;
  planned: number;
  confirmed: number;
  executed: number;
  failed: number;
  undone: number;
  failRate: number;
  undoRate: number;
}

export interface AiIncidentItem {
  id: string;
  type: 'FAILED' | 'UNDONE' | 'MY_DAY_FALLBACK';
  title: string;
  message: string;
  createdAt: string;
  operationId: string;
}

export interface AiPolicyDraftState {
  myDayAutoConfirm: boolean;
  myDayAutoExecute: boolean;
  myDayTaskLimit: number;
  blockDeleteOperations: boolean;
  requireUndoReason: boolean;
  operatorNotes: string;
  promptGuardrails: string;
}
