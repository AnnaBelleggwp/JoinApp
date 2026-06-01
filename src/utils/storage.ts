import { getJoinDataSource } from "./dataSource";

export type ImageAssetKind = "avatar" | "event-cover";
export type ChatAttachmentKind = "chat-image";
export type StorageAssetKind = ImageAssetKind | ChatAttachmentKind;

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const IMAGE_CONFIG = {
  avatar: {
    bucket: "avatars",
    maxBytes: 5 * 1024 * 1024,
    objectPrefix: "avatar",
  },
  "event-cover": {
    bucket: "event-covers",
    maxBytes: 10 * 1024 * 1024,
    objectPrefix: "event-cover",
  },
  "chat-image": {
    bucket: "chat-attachments",
    maxBytes: 10 * 1024 * 1024,
    objectPrefix: "chat-image",
  },
} as const;

function validateImage(file: File, kind: StorageAssetKind) {
  const config = IMAGE_CONFIG[kind];

  if (!IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("Поддерживаются только JPG, PNG и WebP");
  }

  if (file.size > config.maxBytes) {
    const limitMb = Math.round(config.maxBytes / 1024 / 1024);
    throw new Error(`Файл слишком большой. Максимум ${limitMb} МБ`);
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

function extensionForMime(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function createObjectPath(userId: string, file: File, kind: StorageAssetKind, parentId?: string): string {
  const randomId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const extension = extensionForMime(file.type);
  if (parentId) return `${userId}/${parentId}/${IMAGE_CONFIG[kind].objectPrefix}-${randomId}.${extension}`;
  return `${userId}/${IMAGE_CONFIG[kind].objectPrefix}-${randomId}.${extension}`;
}

function parsePublicStorageUrl(value: string): { bucket: string; path: string } | null {
  const publicMarker = "/storage/v1/object/public/";
  const markerIndex = value.indexOf(publicMarker);
  if (markerIndex === -1) return null;

  const objectPath = value.slice(markerIndex + publicMarker.length);
  const [bucket, ...pathParts] = objectPath.split("/");
  const path = pathParts.join("/");

  if (!bucket || !path) return null;
  return { bucket, path: decodeURIComponent(path) };
}

export async function uploadImageAsset(file: File, kind: ImageAssetKind): Promise<string> {
  validateImage(file, kind);

  if (getJoinDataSource() !== "supabase") {
    return readFileAsDataUrl(file);
  }

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("Для загрузки изображения нужна активная сессия");

  const config = IMAGE_CONFIG[kind];
  const path = createObjectPath(userData.user.id, file, kind);
  const { error } = await supabase.storage.from(config.bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(config.bucket).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("Не удалось получить публичный URL изображения");
  }

  return data.publicUrl;
}

export async function uploadChatImageAttachment(file: File, conversationId: string): Promise<string> {
  validateImage(file, "chat-image");

  if (getJoinDataSource() !== "supabase") {
    return readFileAsDataUrl(file);
  }

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("Для загрузки изображения нужна активная сессия");

  const path = createObjectPath(userData.user.id, file, "chat-image", conversationId);
  const { error } = await supabase.storage.from(IMAGE_CONFIG["chat-image"].bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;
  return path;
}

export async function createChatAttachmentUrl(path: string): Promise<string> {
  if (!path || path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (getJoinDataSource() !== "supabase") {
    return path;
  }

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(IMAGE_CONFIG["chat-image"].bucket).createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteStorageAsset(value?: string | null): Promise<void> {
  if (!value || getJoinDataSource() !== "supabase") return;

  const parsed = parsePublicStorageUrl(value);
  if (!parsed) return;

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);

  if (error) throw error;
}
