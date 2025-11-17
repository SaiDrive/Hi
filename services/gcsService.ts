
const GCS_MOCK_STORAGE_KEY_PREFIX = 'brand-ai-gcs-mock';

const getStorageKey = (userId: string) => `${GCS_MOCK_STORAGE_KEY_PREFIX}_${userId}`;

const getStorage = (userId: string): Record<string, string> => {
  try {
    const item = window.localStorage.getItem(getStorageKey(userId));
    return item ? JSON.parse(item) : {};
  } catch (error) {
    console.error('Failed to parse GCS mock storage:', error);
    return {};
  }
};

const saveStorage = (storage: Record<string, string>, userId: string) => {
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(storage));
  } catch (error) {
    console.error('Failed to save to GCS mock storage:', error);
  }
};

const blobToDataURL = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });

export const uploadFile = async (file: Blob, pathPrefix: string, userId: string): Promise<string> => {
  const extension = file.type.split('/')[1] || 'bin';
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const fullPath = `${pathPrefix}/${fileName}`;

  const dataUrl = await blobToDataURL(file);

  const storage = getStorage(userId);
  storage[fullPath] = dataUrl;
  saveStorage(storage, userId);

  return `gcs://${fullPath}`;
};

export const uploadText = async (text: string, pathPrefix: string, userId: string): Promise<string> => {
  const fileName = `${crypto.randomUUID()}.txt`;
  const fullPath = `${pathPrefix}/${fileName}`;

  const storage = getStorage(userId);
  storage[fullPath] = text;
  saveStorage(storage, userId);

  return `gcs://${fullPath}`;
};

export const getContent = async (gcsUrl: string, userId: string): Promise<string | null> => {
  if (!gcsUrl || !gcsUrl.startsWith('gcs://')) {
    return null;
  }
  const path = gcsUrl.substring(6);
  const storage = getStorage(userId);
  return storage[path] ?? null;
};

export const deleteGcsContent = async (gcsUrl: string, userId: string): Promise<void> => {
  if (!gcsUrl || !gcsUrl.startsWith('gcs://')) {
    return;
  }
  const path = gcsUrl.substring(6);
  const storage = getStorage(userId);
  delete storage[path];
  saveStorage(storage, userId);
};
