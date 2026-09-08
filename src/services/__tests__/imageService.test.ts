import {
  MAX_IMAGE_SIZE_MB,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
} from '../../types/image';

import {
  uploadAvatar,
  uploadImageToStorage,
  pickImageFromLibrary,
} from '../imageService';

import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('imageService', () => {
  const originalFetch = globalThis.fetch;
  const originalAtob = globalThis.atob;

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = originalFetch;
    globalThis.atob = originalAtob;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    globalThis.atob = originalAtob;
  });

  describe('Constants', () => {
    it('defines correct size limits', () => {
      expect(MAX_IMAGE_SIZE_MB).toBe(50);
      expect(MAX_IMAGE_SIZE_BYTES).toBe(50 * 1024 * 1024);
    });

    it('contains expected allowed mime types and extensions', () => {
      expect(ALLOWED_IMAGE_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_IMAGE_MIME_TYPES).toContain('image/png');
      expect(ALLOWED_IMAGE_MIME_TYPES).toContain('image/webp');
      expect(ALLOWED_IMAGE_EXTENSIONS).toContain('jpg');
      expect(ALLOWED_IMAGE_EXTENSIONS).toContain('png');
      expect(ALLOWED_IMAGE_EXTENSIONS).toContain('heic');
    });
  });

  describe('uploadAvatar', () => {
    const mockUpload = jest.fn();
    const mockGetPublicUrl = jest.fn();

    beforeEach(() => {
      mockUpload.mockReset();
      mockGetPublicUrl.mockReset();

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });
    });

    it('successfully uploads avatar via base64Data parameter', async () => {
      const dummyBase64 = globalThis.btoa('image-content');
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://cdn.supabase.co/avatars/user-1/avatar.png' },
      });

      const publicUrl = await uploadAvatar('file:///avatar.png', 'user-1', dummyBase64);

      expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-1\/\d+\.png$/),
        expect.any(ArrayBuffer),
        { contentType: 'image/png', upsert: true }
      );
      expect(mockGetPublicUrl).toHaveBeenCalledWith(expect.stringMatching(/^user-1\/\d+\.png$/));
      expect(publicUrl).toBe('https://cdn.supabase.co/avatars/user-1/avatar.png');
    });

    it('successfully uploads avatar via data URI', async () => {
      const dummyBase64 = globalThis.btoa('image-content');
      const dataUri = `data:image/jpeg;base64,${dummyBase64}`;

      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://cdn.supabase.co/avatars/user-2/avatar.jpg' },
      });

      const publicUrl = await uploadAvatar(dataUri, 'user-2');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-2\/\d+\.jpg$/),
        expect.any(ArrayBuffer),
        { contentType: 'image/jpeg', upsert: true }
      );
      expect(publicUrl).toBe('https://cdn.supabase.co/avatars/user-2/avatar.jpg');
    });

    it('falls back to fetch for web blob URIs when base64 is not supplied', async () => {
      const mockBlob = {
        size: 512,
        type: 'image/png',
      };
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      }) as any;

      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://cdn.supabase.co/avatars/user-3/avatar.png' },
      });

      const publicUrl = await uploadAvatar('blob:http://localhost:8081/blob-img', 'user-3');

      expect(globalThis.fetch).toHaveBeenCalledWith('blob:http://localhost:8081/blob-img');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-3\/\d+\.jpg$/),
        mockBlob,
        { contentType: 'image/jpeg', upsert: true }
      );
      expect(publicUrl).toBe('https://cdn.supabase.co/avatars/user-3/avatar.png');
    });

    it('throws error if fetch response fails', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }) as any;

      await expect(
        uploadAvatar('blob:http://localhost:8081/missing-img', 'user-4')
      ).rejects.toThrow('Failed to load selected image (Not Found)');
    });

    it('throws error if supabase upload fails', async () => {
      const dummyBase64 = globalThis.btoa('image-content');
      mockUpload.mockResolvedValue({
        error: { message: 'Storage quota exceeded' },
      });

      await expect(
        uploadAvatar('file:///avatar.jpg', 'user-5', dummyBase64)
      ).rejects.toThrow('Avatar upload failed: Storage quota exceeded');
    });

    it('throws error if public URL retrieval fails', async () => {
      const dummyBase64 = globalThis.btoa('image-content');
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: '' } });

      await expect(
        uploadAvatar('file:///avatar.jpg', 'user-6', dummyBase64)
      ).rejects.toThrow('Failed to retrieve cloud URL for uploaded avatar.');
    });

    it('throws validation error if file exceeds max size', async () => {
      // 51MB base64 string
      const hugeBase64 = 'A'.repeat(Math.ceil((MAX_IMAGE_SIZE_BYTES + 1024) * (4 / 3)));

      await expect(
        uploadAvatar('file:///avatar.jpg', 'user-7', hugeBase64)
      ).rejects.toThrow(/exceeds the 50MB limit/);
    });
  });

  describe('uploadImageToStorage', () => {
    const mockUpload = jest.fn();
    const mockGetPublicUrl = jest.fn();

    beforeEach(() => {
      mockUpload.mockReset();
      mockGetPublicUrl.mockReset();

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });
    });

    it('uploads image payload to custom bucket', async () => {
      const dummyBase64 = globalThis.btoa('image-content');
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://cdn.supabase.co/location_photos/photo1.png' },
      });

      const url = await uploadImageToStorage('location_photos', 'loc-1/photo1.png', {
        uri: 'file:///photo1.png',
        base64: dummyBase64,
        mimeType: 'image/png',
      });

      expect(supabase.storage.from).toHaveBeenCalledWith('location_photos');
      expect(mockUpload).toHaveBeenCalledWith(
        'loc-1/photo1.png',
        expect.any(ArrayBuffer),
        { contentType: 'image/png', upsert: true }
      );
      expect(url).toBe('https://cdn.supabase.co/location_photos/photo1.png');
    });

    it('throws error when upload fails', async () => {
      mockUpload.mockResolvedValue({
        error: { message: 'Bucket not found' },
      });

      await expect(
        uploadImageToStorage('location_photos', 'loc-1/photo1.png', {
          uri: 'file:///photo1.png',
          base64: globalThis.btoa('img'),
        })
      ).rejects.toThrow('Upload failed to location_photos: Bucket not found');
    });

    it('throws error when public URL is missing', async () => {
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: '' } });

      await expect(
        uploadImageToStorage('location_photos', 'loc-1/photo1.png', {
          uri: 'file:///photo1.png',
          base64: globalThis.btoa('img'),
        })
      ).rejects.toThrow('Failed to retrieve cloud URL for uploaded image in location_photos.');
    });
  });

  describe('pickImageFromLibrary', () => {
    it('throws error when media library permission is not granted', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      await expect(pickImageFromLibrary()).rejects.toThrow(
        'Permission to access photo gallery was denied.'
      );
    });

    it('returns null when picker is cancelled', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: null,
      });

      const result = await pickImageFromLibrary();
      expect(result).toBeNull();
    });

    it('returns validated payload when photo is selected', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///photo.jpg',
            base64: 'dGVzdA==',
            mimeType: 'image/jpeg',
            fileSize: 2048,
          },
        ],
      });

      const result = await pickImageFromLibrary({ aspect: [4, 3] });
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      expect(result).toEqual({
        uri: 'file:///photo.jpg',
        base64: 'dGVzdA==',
        mimeType: 'image/jpeg',
        fileSize: 2048,
      });
    });

    it('throws validation error if selected photo exceeds size limit', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///photo.jpg',
            fileSize: MAX_IMAGE_SIZE_BYTES + 1024,
            mimeType: 'image/jpeg',
          },
        ],
      });

      await expect(pickImageFromLibrary()).rejects.toThrow(/exceeds the 50MB limit/);
    });
  });
});
