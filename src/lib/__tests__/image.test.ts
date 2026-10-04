import {
    isLocalUri,
    isAllowedImage,
    getExtensionFromMimeOrUri,
    validateImage,
    decodeBase64ToArrayBuffer
} from '../image';

import {
    MAX_IMAGE_SIZE_MB,
    MAX_IMAGE_SIZE_BYTES
} from '../../types/image'

describe('imageLib', () => {
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





}

)