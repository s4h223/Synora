import '@fontsource-variable/geist';
import '@/styles/globals.css';
import { requestMicAccess } from '@/lib/voice/mic-permission';

const button = document.getElementById('request') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLParagraphElement;

button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'Waiting for your response to Chrome’s prompt…';
  const result = await requestMicAccess();
  if (result.ok) {
    status.textContent = 'Microphone enabled. You can close this tab and return to Synora.';
    status.className = 'text-success';
    return;
  }
  button.disabled = false;
  status.className = 'text-error';
  status.textContent =
    result.error === 'not-allowed'
      ? 'Access was blocked. Click the icon at the left of the address bar to allow the microphone, then try again.'
      : result.error === 'no-device'
        ? 'No microphone was found. Connect one and try again.'
        : `Couldn't access the microphone: ${result.message}`;
});
