export function getCookie(name: string): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export const getToken = (): string | null => {
  return null;
};

export function getAuthHeader(): Record<string, string> {
  return {};
}
