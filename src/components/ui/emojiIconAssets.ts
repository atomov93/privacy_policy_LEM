import React from 'react';
import {SvgProps} from 'react-native-svg';

import GearSvg from '../../../assets/icons/gear.svg';
import IdCardSvg from '../../../assets/icons/id-card.svg';
import KeySvg from '../../../assets/icons/key.svg';
import LinkSvg from '../../../assets/icons/link.svg';
import LockSvg from '../../../assets/icons/lock.svg';
import LockedWithKeySvg from '../../../assets/icons/locked-with-key.svg';
import LockedWithPenSvg from '../../../assets/icons/locked-with-pen.svg';
import PencilSvg from '../../../assets/icons/pencil.svg';
import WastebasketSvg from '../../../assets/icons/wastebasket.svg';

type SvgIcon = React.FC<SvgProps>;

export const EMOJI_ICON_ASSETS: Record<string, SvgIcon> = {
  '🔑': KeySvg,
  '🔒': LockSvg,
  '🔐': LockedWithKeySvg,
  '🔗': LinkSvg,
  '✏️': PencilSvg,
  '✏': PencilSvg,
  '🪪': IdCardSvg,
  '🔏': LockedWithPenSvg,
  '🗑️': WastebasketSvg,
  '🗑': WastebasketSvg,
  '⚙️': GearSvg,
  '⚙': GearSvg,
};

export function getEmojiIconAsset(emoji: string): SvgIcon | undefined {
  return (
    EMOJI_ICON_ASSETS[emoji] ??
    EMOJI_ICON_ASSETS[emoji.replace(/\uFE0F/g, '')]
  );
}
