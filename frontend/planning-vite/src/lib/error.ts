export type UserFriendlyError = {
  userMessage: string;
  status?: number;
  code?: string;
  raw?: unknown;
};

// Extract backend-provided message fields commonly used
function extractBackendMessage(data: any): string | undefined {
  if (!data) return undefined;
  if (typeof data === 'string') return data;
  const direct = data.detail || data.message || data.error;
  if (direct) return direct;

  // DRF-style non_field_errors
  if (Array.isArray(data.non_field_errors)) {
    const parts = data.non_field_errors.filter((x: any) => typeof x === 'string');
    if (parts.length) return parts.join(', ');
  }

  // Field-level errors: { name: ["already exists"], unit: ["..." ] }
  if (typeof data === 'object') {
    const msgs: string[] = [];
    for (const key of Object.keys(data)) {
      if (key === 'non_field_errors') continue;
      const val = (data as any)[key];
      if (typeof val === 'string' && val.trim()) {
        msgs.push(`${key}: ${val}`);
      } else if (Array.isArray(val)) {
        const arr = val.filter((x) => typeof x === 'string' && x.trim());
        if (arr.length) msgs.push(`${key}: ${arr.join(', ')}`);
      }
    }
    if (msgs.length) return msgs.join('; ');
  }

  return undefined;
}

export function toUserMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): UserFriendlyError {
  // Axios error shape
  const anyErr: any = error as any;

  // Network error (no response)
  if (anyErr?.isAxiosError && !anyErr.response) {
    return {
      userMessage: 'Network error. Check your connection and try again.',
      code: 'NETWORK_ERROR',
      raw: error,
    };
  }

  const status: number | undefined = anyErr?.response?.status;
  const data = anyErr?.response?.data;

  // Backend-sent message
  const serverMsg = extractBackendMessage(data);

  // Map common HTTP status codes
  const statusMessageMap: Record<number, string> = {
    400: serverMsg || 'Please check your input and try again.',
    401: 'Your session has expired. Please sign in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: serverMsg || 'This action conflicts with existing data.',
    422: serverMsg || 'Some fields are invalid. Please review and try again.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'The server encountered an error. Please try again later.',
    502: 'Bad gateway. Please try again shortly.',
    503: 'Service unavailable. Please try again later.',
    504: 'Server took too long to respond. Please try again.',
  };

  const mapped = status ? statusMessageMap[status] : undefined;

  const userMessage = serverMsg || mapped || fallback;

  return {
    userMessage,
    status,
    code: anyErr?.code,
    raw: error,
  };
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  const uf = toUserMessage(error, fallback);
  return uf.userMessage;
}
