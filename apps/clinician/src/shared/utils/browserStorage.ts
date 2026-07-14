export function getLocalStorageItem(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function removeLocalStorageItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in hardened or private browser contexts.
  }
}

export function getSessionStorageItem(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function removeSessionStorageItem(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in hardened or private browser contexts.
  }
}

export function setSessionStorageItem(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // The action still runs in the current tab through its window event.
  }
}
