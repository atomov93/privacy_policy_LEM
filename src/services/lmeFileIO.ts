import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {isErrorWithCode, keepLocalCopy, pick} from '@react-native-documents/picker';

import {LME_FILE_EXTENSION, LME_MIME_TYPE} from './limits';

function cachePath(filename: string): string {
  const safe = filename.replace(/[^\w.\-]+/g, '_');
  return `${RNFS.CachesDirectoryPath}/${safe}`;
}

/** Write .lme contents to a temp file and return its absolute path. */
export async function writeLmeTempFile(
  contents: string,
  filename: string,
): Promise<string> {
  const path = cachePath(filename.endsWith(`.${LME_FILE_EXTENSION}`)
    ? filename
    : `${filename}.${LME_FILE_EXTENSION}`);
  await RNFS.writeFile(path, contents, 'utf8');
  return path;
}

/** Share a local .lme file through the system share sheet. */
export async function shareLmeFile(
  path: string,
  filename: string,
): Promise<boolean> {
  try {
    const url = path.startsWith('file://') ? path : `file://${path}`;
    await Share.open({
      url,
      type: LME_MIME_TYPE,
      filename,
      failOnCancel: false,
      showAppsToView: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Read UTF-8 contents from a file:// or content:// URI. */
export async function readUriAsUtf8(uri: string): Promise<string> {
  const normalized = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
  if (Platform.OS === 'android' && uri.startsWith('content://')) {
    return RNFS.readFile(uri, 'utf8');
  }
  return RNFS.readFile(normalized, 'utf8');
}

/**
 * Open the system document picker for a .lme (or any) file and return contents.
 */
export async function pickAndReadLmeFile(): Promise<string | null> {
  try {
    const [file] = await pick({
      allowMultiSelection: false,
      mode: 'import',
      // Custom MIME + catch-all so providers that strip types still work.
      type: [LME_MIME_TYPE, 'application/octet-stream', '*/*'],
    });
    if (!file) {
      return null;
    }

    const name = (file.name ?? '').toLowerCase();
    if (name && !name.endsWith(`.${LME_FILE_EXTENSION}`)) {
      // Still allow if the content looks like LME after read.
    }

    if (file.uri.startsWith('content://') || Platform.OS === 'ios') {
      const [local] = await keepLocalCopy({
        files: [
          {
            uri: file.uri,
            fileName: file.name ?? `import.${LME_FILE_EXTENSION}`,
          },
        ],
        destination: 'cachesDirectory',
      });
      if (local.status === 'success') {
        return readUriAsUtf8(local.localUri);
      }
    }

    return readUriAsUtf8(file.uri);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === 'DOCUMENT_PICKER_CANCELED') {
      return null;
    }
    throw error;
  }
}

export function isLikelyLmeUri(uri: string | null | undefined): boolean {
  if (!uri) {
    return false;
  }
  const lower = uri.toLowerCase();
  return (
    lower.includes(`.${LME_FILE_EXTENSION}`) ||
    lower.includes('letsmessageencrypt') ||
    lower.startsWith('content://') ||
    lower.startsWith('file://')
  );
}
