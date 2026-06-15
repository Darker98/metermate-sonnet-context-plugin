const SESSION_KEY = 'metermate_session_id';

function generateId(): string {
  return `sess_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateId();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function resetSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
