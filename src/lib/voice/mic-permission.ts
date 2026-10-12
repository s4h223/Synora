export type MicPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function queryMicPermission(): Promise<MicPermission> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch {
    return 'unsupported';
  }
}

export type MicRequestResult =
  | { ok: true }
  | { ok: false; error: 'not-allowed' | 'no-device' | 'unsupported' | 'unknown'; message: string };

/**
 * Request microphone access and immediately release it. Nothing is recorded.
 *
 * Chrome often can't show the permission prompt inside a side panel. When that
 * happens the request fails with NotAllowedError and the caller should open the
 * extension's permissions page in a tab, where the prompt works. The grant then
 * applies to the whole extension origin, including the side panel.
 */
export async function requestMicAccess(): Promise<MicRequestResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: 'unsupported', message: 'Microphone API unavailable' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    return { ok: true };
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    const message = error instanceof Error ? error.message : String(error);
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return { ok: false, error: 'not-allowed', message };
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return { ok: false, error: 'no-device', message };
    }
    return { ok: false, error: 'unknown', message };
  }
}

export function openMicPermissionPage(): Promise<unknown> {
  return browser.tabs.create({ url: browser.runtime.getURL('/permissions.html') });
}
