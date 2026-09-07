// Limit
export const MAX_IMAGE_SIZE_MB = 50;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export interface ImageUploadPayload {
    uri: string;
    base64?: string | null;
    mimeType?: string | null;
    fileSize?: number;
}

export interface PickImageOptions {
    aspect?: [number, number];
    allowsEditing?: boolean;
    quality?: number;
}

export const ALLOWED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
];

export const ALLOWED_IMAGE_EXTENSIONS = [
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
    'heic',
    'heif',
];