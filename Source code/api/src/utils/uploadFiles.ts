import { promises as fs } from 'fs';
import path from 'path';
import { UPLOAD_DIR } from '../config/upload';

interface StoredUpload {
  filename: string;
}

const resolveStoredUpload = (filename: string): string | null => {
  const safeFilename = path.basename(filename);
  if (!safeFilename || safeFilename !== filename) return null;

  const resolved = path.resolve(UPLOAD_DIR, safeFilename);
  if (path.dirname(resolved) !== UPLOAD_DIR) return null;
  return resolved;
};

export const removeStoredUploads = async (
  uploads: StoredUpload[]
): Promise<void> => {
  await Promise.all(
    uploads.map(async ({ filename }) => {
      const filePath = resolveStoredUpload(filename);
      if (!filePath) {
        console.warn(`Skipped unsafe upload filename during cleanup: ${filename}`);
        return;
      }

      try {
        await fs.unlink(filePath);
      } catch (error: any) {
        if (error?.code !== 'ENOENT') {
          console.error(`Failed to remove uploaded file ${filename}:`, error);
        }
      }
    })
  );
};
