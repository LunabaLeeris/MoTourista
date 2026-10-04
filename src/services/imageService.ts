import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { getExtensionFromMimeOrUri, validateImage, decodeBase64ToArrayBuffer } from '../lib/image';
import { ImageUploadPayload, PickImageOptions } from '../types/image';

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
