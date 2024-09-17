import { DEBUG } from '../config';

export const CLIPBOARD_ITEM_SUPPORTED = window.navigator.clipboard && window.ClipboardItem;

const textCopyEl = document.createElement('textarea');
textCopyEl.setAttribute('readonly', '');
textCopyEl.tabIndex = -1;
textCopyEl.className = 'visually-hidden';

export const copyTextToClipboard = (str: string): void => {
  textCopyEl.value = str;
  document.body.appendChild(textCopyEl);
  const selection = document.getSelection();

  if (selection) {
    // Store previous selection
    const rangeToRestore = selection.rangeCount > 0 && selection.getRangeAt(0);
    textCopyEl.select();
    document.execCommand('copy');
    // Restore the original selection
    if (rangeToRestore) {
      selection.removeAllRanges();
      selection.addRange(rangeToRestore);
    }
  }

  document.body.removeChild(textCopyEl);
};

export const copyHtmlToClipboard = (html: string, text: string): void => {
  if (!window.navigator.clipboard?.write) {
    copyTextToClipboard(text);
    return;
  }

  window.navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': new Blob([text], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    }),
  ]);
};

// @ts-ignore

export function sendMessageToParentWindow(content: { image?: any; text?: string; message?: any }) {
  window.parent.postMessage(
    {
      type: 'form-content',
      message: {
        ...content,
      },
    },
    '*',
  );
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    // @ts-ignore
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export const convertToBlob = (imageUrl?: string): Promise<Blob> => new Promise((resolve, reject) => {
  if (!imageUrl) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const imageEl = new Image();
  imageEl.onload = (e: Event) => {
    if (ctx && e.currentTarget) {
      const img = e.currentTarget as HTMLImageElement;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      canvas.toBlob(resolve, 'image/png', 1);
    }
  };

  imageEl.src = imageUrl;
});

async function copyBlobToClipboard(pngBlob: Blob | null) {
  if (!pngBlob || !CLIPBOARD_ITEM_SUPPORTED) {
    return;
  }

  try {
    await window.navigator.clipboard.write?.([
      new ClipboardItem({
        [pngBlob.type]: pngBlob,
      }),
    ]);
  } catch (error) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }
}
