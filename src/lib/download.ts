/**
 * Saves a text file. On iPhone (especially the installed home-screen app, where
 * downloads are unreliable) it opens the share sheet so the file can go to Files,
 * AirDrop, Mail…; elsewhere it triggers a normal download.
 */
export async function saveTextFile(name: string, text: string, mime: string): Promise<void> {
  const file = new File([text], name, { type: mime });
  const isIOS =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  if (isIOS && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return; // user closed the sheet
      // otherwise fall through to a normal download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
