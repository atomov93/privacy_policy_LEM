import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';

import {
  LME_FILE_EXTENSION,
  LME_IOS_UTI,
  LME_MIME_TYPE,
} from './limits';

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
    const absolute = path.startsWith('file://')
      ? path.replace(/^file:\/\//, '')
      : path;
    // encodeURI keeps path separators while escaping spaces/special chars.
    const url = `file://${encodeURI(absolute)}`;
    await Share.open({
      url,
      // iOS wants a UTI; Android wants a MIME type.
      type: Platform.OS === 'ios' ? LME_IOS_UTI : LME_MIME_TYPE,
      filename,
      failOnCancel: false,
      ...(Platform.OS === 'android' ? {showAppsToView: true} : {}),
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
      // iOS requires UTIs (MIME strings grey out unknown extensions like .lme).
      // Allow all items so Files.app can select shared .lme documents; content is
      // validated after read via isLmeFileContents.
      type:
        Platform.OS === 'ios'
          ? [types.allFiles, LME_IOS_UTI, 'public.data']
          : [LME_MIME_TYPE, 'application/octet-stream', types.allFiles],
    });
    if (!file) {
      return null;
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
