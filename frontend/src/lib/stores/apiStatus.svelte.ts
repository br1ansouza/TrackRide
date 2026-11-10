export type ApiState = 'idle' | 'connecting' | 'waking' | 'ready' | 'unavailable' | 'offline';
export const apiStatus = $state<{ state: ApiState }>({ state: 'idle' });
