import type { ApiMessage } from '../../../../api/types';
import type { IconName } from '../../../../types/icons';
import { ApiMediaFormat } from '../../../../api/types';

import {
  getMessageHtmlId,
  getMessagePhoto,
  getMessageText,
  getMessageWebPagePhoto,
  getMessageWebPageVideo,
  getPhotoMediaHash,
  hasMediaLocalBlobUrl,
} from '../../../../global/helpers';
import { getMessageTextWithSpoilers } from '../../../../global/helpers/messageSummary';
import getMessageIdsForSelectedText from '../../../../util/getMessageIdsForSelectedText';
import * as mediaLoader from '../../../../util/mediaLoader';
import {
  blobToBase64,
  CLIPBOARD_ITEM_SUPPORTED,
  convertToBlob,
  sendMessageToParentWindow,
} from '../../../../util/onlik-bridge';
import { IS_SAFARI } from '../../../../util/windowEnvironment';

type ICopyOptions = {
  label: string;
  icon: IconName;
  handler: () => void;
}[];

export function getMessageSendToParentWindowOptions(
  message: ApiMessage,
  canCopy?: boolean,
  afterEffect?: () => void,
  onCopyMessages?: (messageIds: number[]) => void,
): ICopyOptions {
  const options: ICopyOptions = [];
  const text = getMessageText(message);
  const photo = getMessagePhoto(message)
    || (!getMessageWebPageVideo(message) ? getMessageWebPagePhoto(message) : undefined);
  const mediaHash = photo ? getPhotoMediaHash(photo, 'inline') : undefined;
  const canImageBeCopied = canCopy && photo && (mediaHash || hasMediaLocalBlobUrl(photo))
    && CLIPBOARD_ITEM_SUPPORTED && !IS_SAFARI;
  const selection = window.getSelection();

  if (canImageBeCopied && canCopy && text) {
    // Detect if the user has selection in the current message
    const hasSelection = Boolean((
      selection?.anchorNode?.parentNode
      && (selection.anchorNode.parentNode as HTMLElement).closest('.Message .content-inner')
      && selection.toString().replace(/(?:\r\n|\r|\n)/g, '') !== ''
      && checkMessageHasSelection(message)
    ));

    options.push({
      label: `${getCopyLabel(hasSelection)} и картинку`,
      icon: 'copy',
      handler: () => {
        // @ts-ignore
        function getText() {
          const messageIds = getMessageIdsForSelectedText();
          if (messageIds?.length && onCopyMessages) {
            // onCopyMessages(messageIds);
            return undefined;
          } else if (hasSelection) {
            // @ts-ignore
            return selection.toString();
          } else {
            return getMessageTextWithSpoilers(message);
          }
        }
        const ntext = getText();
        Promise.resolve(mediaHash ? mediaLoader.fetch(mediaHash, ApiMediaFormat.BlobUrl) : photo!.blobUrl)
          .then(convertToBlob)
          .then(blobToBase64)
          .then((image) => sendMessageToParentWindow({ image, text: ntext, message }));

        afterEffect?.();
      },
    });
  }

  if (canImageBeCopied) {
    options.push({
      label: 'Отправить картинку',
      icon: 'copy-media',
      handler: () => {
        Promise.resolve(mediaHash ? mediaLoader.fetch(mediaHash, ApiMediaFormat.BlobUrl) : photo!.blobUrl)
          .then(convertToBlob)
          .then(blobToBase64)
          .then((image) => sendMessageToParentWindow({ image, message }));

        afterEffect?.();
      },
    });
  }

  if (canCopy && text) {
    // Detect if the user has selection in the current message
    const hasSelection = Boolean((
      selection?.anchorNode?.parentNode
      && (selection.anchorNode.parentNode as HTMLElement).closest('.Message .content-inner')
      && selection.toString().replace(/(?:\r\n|\r|\n)/g, '') !== ''
      && checkMessageHasSelection(message)
    ));

    options.push({
      label: getCopyLabel(hasSelection),
      icon: 'copy',
      handler: () => {
        const messageIds = getMessageIdsForSelectedText();
        if (messageIds?.length && onCopyMessages) {
          // onCopyMessages(messageIds);
        } else if (hasSelection) {
          sendMessageToParentWindow({
            // @ts-ignore
            text: selection.toString()!,
            message,
          });
        } else {
          sendMessageToParentWindow({
            text: getMessageTextWithSpoilers(message)!,
            message,
          });
        }

        afterEffect?.();
      },
    });
  }

  return options;
}
function checkMessageHasSelection(message: ApiMessage): boolean {
  const selection = window.getSelection();
  const selectionParentNode = (selection?.anchorNode?.parentNode as HTMLElement);
  const selectedMessageElement = selectionParentNode?.closest<HTMLDivElement>('.Message.message-list-item');
  return getMessageHtmlId(message.id) === selectedMessageElement?.id;
}
function getCopyLabel(hasSelection: boolean): string {
  if (hasSelection) {
    return 'Отправить выделенный текст';
  }
  return 'Отправить текст';
}
