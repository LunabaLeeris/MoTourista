import {
  MAX_IMAGE_SIZE_MB,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  isLocalUri,
  isAllowedImage,
  getExtensionFromMimeOrUri,
  validateImage,
  decodeBase64ToArrayBuffer,
  uploadAvatar,
} from '../imageService';
import { supabase } from '../../lib/supabase';

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

  describe('isLocalUri', () => {
    it('identifies local protocols as local', () => {
      expect(isLocalUri('blob:http://localhost:8081/12345')).toBe(true);
      expect(isLocalUri('file:///var/mobile/Containers/photo.jpg')).toBe(true);
      expect(isLocalUri('content://media/external/images/media/123')).toBe(true);
      expect(isLocalUri('ph://photo-identifier-123')).toBe(true);
      expect(isLocalUri('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    });

    it('identifies local hostnames as local', () => {
      expect(isLocalUri('http://localhost:8081/assets/avatar.png')).toBe(true);
      expect(isLocalUri('http://127.0.0.1:8081/assets/avatar.png')).toBe(true);
    });

    it('identifies remote urls as non-local', () => {
      expect(isLocalUri('https://example.com/avatar.jpg')).toBe(false);
      expect(
        isLocalUri(
          'https://xyz.supabase.co/storage/v1/object/public/avatars/user/123.jpg'
        )
      ).toBe(false);
    });
  });

  describe('isAllowedImage', () => {
    it('returns true for supported MIME types', () => {
      expect(isAllowedImage('image/jpeg')).toBe(true);
      expect(isAllowedImage('image/png')).toBe(true);
      expect(isAllowedImage('image/webp')).toBe(true);
      expect(isAllowedImage('image/heic')).toBe(true);
      expect(isAllowedImage('IMAGE/PNG')).toBe(true);
      expect(isAllowedImage('image/vnd.adobe.photoshop')).toBe(true);
    });

    it('returns true for valid extensions in URIs', () => {
      expect(isAllowedImage(null, 'file:///photos/profile.jpg')).toBe(true);
      expect(isAllowedImage(null, 'file:///photos/profile.jpeg')).toBe(true);
      expect(isAllowedImage(null, 'file:///photos/profile.png?width=100')).toBe(true);
      expect(isAllowedImage(null, 'file:///photos/profile.webp#thumb')).toBe(true);
      expect(isAllowedImage(null, 'file:///photos/profile.heif')).toBe(true);
    });

    it('returns false for unsupported formats or missing parameters', () => {
      expect(isAllowedImage('application/pdf', 'file:///document.pdf')).toBe(false);
      expect(isAllowedImage('text/plain')).toBe(false);
      expect(isAllowedImage(null, 'file:///archive.zip')).toBe(false);
      expect(isAllowedImage(null, null)).toBe(false);
      expect(isAllowedImage()).toBe(false);
    });
  });

  describe('getExtensionFromMimeOrUri', () => {
    it('extracts and normalizes extension from MIME type', () => {
      expect(getExtensionFromMimeOrUri('image/jpeg')).toBe('jpg');
      expect(getExtensionFromMimeOrUri('image/png')).toBe('png');
      expect(getExtensionFromMimeOrUri('image/webp')).toBe('webp');
    });

    it('extracts and normalizes extension from URI when MIME type is missing', () => {
      expect(getExtensionFromMimeOrUri(null, 'file:///photos/profile.jpeg')).toBe('jpg');
      expect(getExtensionFromMimeOrUri(null, 'https://cdn.test/avatar.png?v=2')).toBe('png');
      expect(getExtensionFromMimeOrUri(null, 'file:///photos/rider.heic#main')).toBe('heic');
    });

    it('returns default "jpg" when format cannot be determined', () => {
      expect(getExtensionFromMimeOrUri(null, null)).toBe('jpg');
      expect(getExtensionFromMimeOrUri('application/pdf', 'file:///doc.pdf')).toBe('jpg');
    });
  });

  describe('validateImage', () => {
    it('passes validation for allowed size and format', () => {
      expect(() => {
        validateImage(1024 * 1024, 'image/jpeg', 'file:///avatar.jpg');
      }).not.toThrow();
    });

    it('passes validation when sizeBytes is undefined but format is valid', () => {
      expect(() => {
        validateImage(undefined, 'image/png');
      }).not.toThrow();
    });

    it('throws error when file size exceeds limit', () => {
      const oversizedBytes = MAX_IMAGE_SIZE_BYTES + 1024;
      expect(() => {
        validateImage(oversizedBytes, 'image/jpeg', 'file:///avatar.jpg');
      }).toThrow(`File size (50.0MB) exceeds the ${MAX_IMAGE_SIZE_MB}MB limit.`);
    });

    it('throws error when image format is disallowed', () => {
      expect(() => {
        validateImage(1024, 'application/pdf', 'file:///doc.pdf');
      }).toThrow(/Selected file is not an allowed image format/);
    });
  });

  describe('decodeBase64ToArrayBuffer', () => {
    const text = 'Hello Motourista!';
    const base64Standard = globalThis.btoa(text);
    const dataUri = `data:image/png;base64,${base64Standard}`;

    it('decodes base64 string using globalThis.atob', () => {
      const buffer = decodeBase64ToArrayBuffer(base64Standard);
      const decodedText = new TextDecoder().decode(buffer);
      expect(decodedText).toBe(text);
    });

    it('strips data URI prefix before decoding', () => {
      const buffer = decodeBase64ToArrayBuffer(dataUri);
      const decodedText = new TextDecoder().decode(buffer);
      expect(decodedText).toBe(text);
    });

    it('decodes base64 string using fallback loop when atob is undefined', () => {
      // Temporarily remove globalThis.atob to trigger custom fallback decoder
      // @ts-ignore
      globalThis.atob = undefined;

      // Test without padding
      const raw3 = 'Any3'; // 3 bytes -> 4 base64 chars
      const b64_3 = globalThis.btoa(raw3);
      const buf3 = decodeBase64ToArrayBuffer(b64_3);
      expect(new TextDecoder().decode(buf3)).toBe(raw3);

      // Test with '=' padding (2 bytes -> 3 base64 chars + '=')
      const raw2 = 'AB';
      const b64_2 = globalThis.btoa(raw2);
      const buf2 = decodeBase64ToArrayBuffer(b64_2);
      expect(new TextDecoder().decode(buf2)).toBe(raw2);

      // Test with '==' padding (1 byte -> 2 base64 chars + '==')
      const raw1 = 'A';
      const b64_1 = globalThis.btoa(raw1);
      const buf1 = decodeBase64ToArrayBuffer(b64_1);
      expect(new TextDecoder().decode(buf1)).toBe(raw1);
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
});
