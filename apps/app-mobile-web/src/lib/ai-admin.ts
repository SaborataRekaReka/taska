import { ApiError, api } from './api';
import type { AiOperationDetail, AiOperationsListResponse, HistoryEvent } from './types';

const DEFAULT_OPERATION_LIMIT = 80;
const MAX_OPERATION_LIMIT = 100;
const FETCH_CONCURRENCY = 6;

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_OPERATION_LIMIT;
  }
  if (limit < 1) {
    return 1;
  }
  if (limit > MAX_OPERATION_LIMIT) {
    return MAX_OPERATION_LIMIT;
  }
  return Math.floor(limit);
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  if (values.length === 0) {
    return [];
  }

  const workers = Math.max(1, Math.min(concurrency, values.length));
  const result: R[] = new Array(values.length);
  let cursor = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) {
        return;
      }
      result[index] = await mapper(values[index]);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => runWorker()));
  return result;
}

export async function listAiOperationsFromHistory(limit = DEFAULT_OPERATION_LIMIT): Promise<AiOperationDetail[]> {
  const take = clampLimit(limit);

  try {
    const direct = await api.get<AiOperationsListResponse>(`/ai/operations?limit=${take}`);
    return direct.items
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }
  }

  const history = await api.get<HistoryEvent[]>(`/history?limit=${take}`);
  const aiHistory = history.filter((event) => event.entityType === 'AI_OPERATION');

  const operationIds = [...new Set(aiHistory.map((event) => event.entityId).filter(Boolean))];
  const details = await mapWithConcurrency(operationIds, FETCH_CONCURRENCY, async (operationId) => {
    try {
      return await api.get<AiOperationDetail>(`/ai/operations/${operationId}`);
    } catch {
      return null;
    }
  });

  return details
    .filter((item): item is AiOperationDetail => item !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function isFallbackMyDayOperation(operation: AiOperationDetail): boolean {
  const prompt = operation.prompt.toLowerCase();
  return prompt.includes('fallback my day') || prompt.includes('my_day_fallback');
}
