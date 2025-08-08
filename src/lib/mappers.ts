// Helper mappers and type guards to normalize DB data to UI-friendly shapes

export type ActivityStatus = 'info' | 'success' | 'warning' | 'error';
export type BotStatus = 'running' | 'paused' | 'stopped';

export const mapDbActivityStatus = (status: string | null | undefined): ActivityStatus => {
  switch ((status || '').toLowerCase()) {
    case 'success':
    case 'ok':
      return 'success';
    case 'error':
    case 'failed':
    case 'danger':
      return 'error';
    case 'warning':
    case 'warn':
      return 'warning';
    default:
      return 'info';
  }
};

export const mapDbBotStatus = (status: string | null | undefined): BotStatus => {
  switch ((status || '').toLowerCase()) {
    case 'running':
    case 'active':
    case 'started':
      return 'running';
    case 'paused':
      return 'paused';
    case 'stopped':
    case 'stop':
    default:
      return 'stopped';
  }
};

export const isRecord = (val: unknown): val is Record<string, any> =>
  !!val && typeof val === 'object' && !Array.isArray(val);

export const asObjectOrEmpty = <T extends object = Record<string, any>>(val: unknown, fallback: T = {} as T): T =>
  (isRecord(val) ? (val as T) : fallback);

export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const out = {} as Pick<T, K>;
  keys.forEach((k) => {
    if (k in obj) (out as any)[k] = obj[k];
  });
  return out;
};
