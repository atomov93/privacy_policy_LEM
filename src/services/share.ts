import {Share} from 'react-native';

export async function shareText(
  message: string,
  title?: string,
): Promise<boolean> {
  if (!message) {
    return false;
  }
  try {
    const result = await Share.share({message, title});
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}
