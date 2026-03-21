import axios from 'axios';

export function getApiErrorMessage(err: unknown, fallback = '操作失敗'): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}
