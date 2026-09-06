import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

// Limit
export const MAX_IMAGE_SIZE_MB = 50; // 50 megabytes
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

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

// Check whether a URI points to a local or temporary instance rather than a remote cloud URL.
export function isLocalUri(uri: string): boolean {
  return (
    uri.startsWith('blob:') ||
    uri.startsWith('file:') ||
    uri.startsWith('content:') ||
    uri.startsWith('ph:') ||
    uri.startsWith('data:') ||
    uri.includes('localhost') ||
    uri.includes('127.0.0.1')
  );
}

// Guard clause to verify whether a given MIME type or file URI is an allowed image.
export function isAllowedImage(mimeType?: string | null, uri?: string | null): boolean {
  if (mimeType) {
    const lower = mimeType.toLowerCase();
    if (ALLOWED_IMAGE_MIME_TYPES.includes(lower) || lower.startsWith('image/')) {
      return true;
    }
  }
  if (uri) {
    const cleanUri = uri.split('?')[0].split('#')[0];
    const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
    if (match) {
      const ext = match[1].toLowerCase();
      if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        return true;
      }
    }
  }
  return false;
}

// Extract normalized file extension from MIME type or URI.
export function getExtensionFromMimeOrUri(
  mimeType?: string | null,
  uri?: string | null
): string {
  const mimeExt = mimeType?.split('/')[1]?.toLowerCase().replace('jpeg', 'jpg');
  if (mimeExt && ALLOWED_IMAGE_EXTENSIONS.includes(mimeExt)) {
    return mimeExt;
  }

  const uriExt = uri?.split(/[#?]/)[0].split('.').pop()?.toLowerCase().replace('jpeg', 'jpg');
  if (uriExt && ALLOWED_IMAGE_EXTENSIONS.includes(uriExt)) {
    return uriExt;
  }

  return 'jpg';
}

// Guard clause to validate image file size and format before uploading.
export function validateImage(
  sizeBytes?: number,
  mimeType?: string | null,
  uri?: string | null
): void {
  if (sizeBytes !== undefined && sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`File size (${sizeMb}MB) exceeds the ${MAX_IMAGE_SIZE_MB}MB limit.`);
  }

  if ((mimeType || uri) && !isAllowedImage(mimeType, uri)) {
    const allowedFormats = ALLOWED_IMAGE_EXTENSIONS.map((ext) => `.${ext}`).join(', ');
    throw new Error(`Selected file is not an allowed image format (${allowedFormats}).`);
  }
}

// Decode a Base64 string into an ArrayBuffer.
// [THOUGHTS] too bulky
export function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  // Remove data URI prefix if it is present.
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

  if (typeof globalThis.atob === 'function') {
    const binaryString = globalThis.atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = cleanBase64.length * 0.75;
  if (cleanBase64.endsWith('==')) {
    bufferLength -= 2;
  } else if (cleanBase64.endsWith('=')) {
    bufferLength -= 1;
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const e1 = lookup[cleanBase64.charCodeAt(i)];
    const e2 = lookup[cleanBase64.charCodeAt(i + 1)];
    const e3 = lookup[cleanBase64.charCodeAt(i + 2)];
    const e4 = lookup[cleanBase64.charCodeAt(i + 3)];

    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (cleanBase64[i + 2] !== '=') {
      bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    }
    if (cleanBase64[i + 3] !== '=') {
      bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
    }
  }

  return arrayBuffer;
}

// Type aliases for allowed image formats.
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
export type AllowedImageExtension = (typeof ALLOWED_IMAGE_EXTENSIONS)[number];

// Standard payload interface for image uploads across the app.
export interface ImageUploadPayload {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
  fileSize?: number;
}

// General purpose helper to upload an image to any Supabase Storage bucket.
export async function uploadImageToStorage(
  bucket: string,
  filePath: string,
  payload: ImageUploadPayload | string,
  base64Fallback?: string | null
): Promise<string> {
  const uri = typeof payload === 'string' ? payload : payload.uri;
  const base64Data = typeof payload === 'string' ? base64Fallback : payload.base64;
  const mimeType = typeof payload === 'string' ? null : payload.mimeType;
  const fileSize = typeof payload === 'string' ? undefined : payload.fileSize;

  const fileExt = getExtensionFromMimeOrUri(mimeType, uri);
  const contentType =
    fileExt === 'png'
      ? 'image/png'
      : fileExt === 'webp'
      ? 'image/webp'
      : 'image/jpeg';

  let body: ArrayBuffer | Blob;
  const rawBase64 =
    base64Data || (uri.startsWith('data:') ? uri.split(',')[1] : null);

  if (rawBase64) {
    const estimatedSizeBytes = fileSize || Math.round((rawBase64.length * 3) / 4);
    validateImage(estimatedSizeBytes, contentType, uri);
    body = decodeBase64ToArrayBuffer(rawBase64);
  } else {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(
        `Failed to load selected image (${response.statusText || response.status})`
      );
    }
    body = await response.blob();
    validateImage(fileSize || body.size, body.type || contentType, uri);
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, body, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed to ${bucket}: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error(`Failed to retrieve cloud URL for uploaded image in ${bucket}.`);
  }

  return urlData.publicUrl;
}

// Upload local avatar to the Supabase Storage 'avatars' vault and return its public URL.
export async function uploadAvatar(
  localUri: string,
  userId: string,
  base64Data?: string | null
): Promise<string> {
  const fileExt = getExtensionFromMimeOrUri(null, localUri);
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  try {
    return await uploadImageToStorage('avatars', filePath, {
      uri: localUri,
      base64: base64Data,
    });
  } catch (error: any) {
    if (error.message?.includes('Upload failed to avatars:')) {
      throw new Error(
        `Avatar upload failed: ${error.message.replace('Upload failed to avatars: ', '')}`
      );
    }
    if (error.message?.includes('Failed to retrieve cloud URL')) {
      throw new Error('Failed to retrieve cloud URL for uploaded avatar.');
    }
    throw error;
  }
}

// Options for configuring image library picker.
export interface PickImageOptions {
  aspect?: [number, number];
  allowsEditing?: boolean;
  quality?: number;
}

// Request permission and open media library image picker with validation.
export async function pickImageFromLibrary(
  options: PickImageOptions = {}
): Promise<ImageUploadPayload | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error(
      'Permission to access photo gallery was denied. Please allow photo access in device settings.'
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options.allowsEditing ?? true,
    aspect: options.aspect ?? [4, 3],
    quality: options.quality ?? 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  validateImage(asset.fileSize, asset.mimeType, asset.uri);

  return {
    uri: asset.uri,
    base64: asset.base64 || null,
    mimeType: asset.mimeType || 'image/jpeg',
    fileSize: asset.fileSize,
  };
}
