import {
  createPost,
  fetchUserPosts,
  fetchPostById,
  deletePost,
  uploadLocationPhoto,
  CreatePostParams,
} from '../postService';
import { supabase } from '../../lib/supabase';
import { LocationWithDetails } from '../../types/database';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('postService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = originalFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const mockLocation: LocationWithDetails = {
    id: 'loc-123',
    title: 'Marilaque Coffee Stop',
    description: 'Scenic viewpoint and coffee along the highway',
    address: 'Tanay, Rizal',
    latitude: 14.6543,
    longitude: 121.3456,
    status_id: 'pending',
    created_by: 'user-123',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    location_statuses: {
      id: 'pending',
      label: 'Pending Verification',
      description: 'Awaiting administrative verification',
      display_order: 10,
      created_at: '2026-01-01T00:00:00Z',
    },
    location_images: [
      {
        id: 'img-1',
        location_id: 'loc-123',
        image_url: 'https://cdn.supabase.co/locations/photo1.jpg',
        caption: '',
        display_order: 1,
        created_at: '2026-09-01T10:00:00Z',
      },
    ],
    location_tags: [
      {
        location_id: 'loc-123',
        tag_id: 'coffee_spot',
        description: '',
        created_at: '2026-09-01T10:00:00Z',
        tags: {
          id: 'coffee_spot',
          name: 'Coffee Spot',
          icon: 'coffee-outline',
          display_order: 60,
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ],
    location_hearts: [],
    location_visits: [],
    profiles: {
      id: 'user-123',
      full_name: 'Ron Rider',
      avatar_url: null,
      driver_type_id: null,
      vehicle_type_id: null,
      motorcycle_model_id: null,
      is_onboarded: true,
      latitude: null,
      longitude: null,
      location_name: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  };

  describe('createPost', () => {
    const validParams: CreatePostParams = {
      userId: 'user-123',
      title: 'Marilaque Coffee Stop',
      description: 'Scenic viewpoint and coffee along the highway',
      address: 'Tanay, Rizal',
      latitude: 14.6543,
      longitude: 121.3456,
      tagIds: ['coffee_spot'],
      images: [
        {
          uri: 'file:///data/user/0/cache/photo1.jpg',
          base64: 'dGVzdA==',
          mimeType: 'image/jpeg',
          fileSize: 1024,
        },
      ],
    };

    it('throws error when userId is missing', async () => {
      await expect(
        createPost({ ...validParams, userId: '' })
      ).rejects.toThrow('User ID is required to create a post.');
    });

    it('throws error when title is empty or only whitespace', async () => {
      await expect(
        createPost({ ...validParams, title: '   ' })
      ).rejects.toThrow('Location title is required.');
    });

    it('throws error when latitude is invalid', async () => {
      await expect(
        createPost({ ...validParams, latitude: 100 })
      ).rejects.toThrow('Valid latitude between -90 and 90 is required.');

      await expect(
        createPost({ ...validParams, latitude: NaN })
      ).rejects.toThrow('Valid latitude between -90 and 90 is required.');
    });

    it('throws error when longitude is invalid', async () => {
      await expect(
        createPost({ ...validParams, longitude: -200 })
      ).rejects.toThrow('Valid longitude between -180 and 180 is required.');

      await expect(
        createPost({ ...validParams, longitude: NaN })
      ).rejects.toThrow('Valid longitude between -180 and 180 is required.');
    });

    it('throws error when location creation fails in Supabase', async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database insert rejected' },
      });
      const selectMock = jest.fn().mockReturnValue({ single: singleMock });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

      await expect(createPost(validParams)).rejects.toThrow('Database insert rejected');
    });

    it('successfully creates post with tags and uploads images', async () => {
      // Mock locations insert
      const singleLocationMock = jest.fn().mockResolvedValue({
        data: { id: 'loc-123', title: validParams.title },
        error: null,
      });
      const selectLocationMock = jest.fn().mockReturnValue({ single: singleLocationMock });
      const insertLocationMock = jest.fn().mockReturnValue({ select: selectLocationMock });

      // Mock tags insert
      const insertTagsMock = jest.fn().mockResolvedValue({ error: null });

      // Mock images insert
      const insertImagesMock = jest.fn().mockResolvedValue({ error: null });

      // Mock fetchPostById query
      const maybeSingleFetchMock = jest.fn().mockResolvedValue({
        data: mockLocation,
        error: null,
      });
      const eqFetchMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleFetchMock });
      const selectFetchMock = jest.fn().mockReturnValue({ eq: eqFetchMock });

      // Mock storage upload
      const uploadMock = jest.fn().mockResolvedValue({ error: null });
      const getPublicUrlMock = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://cdn.supabase.co/locations/photo1.jpg' },
      });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      });

      // supabase.from routing
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            insert: insertLocationMock,
            select: selectFetchMock,
          };
        }
        if (table === 'location_tags') {
          return { insert: insertTagsMock };
        }
        if (table === 'location_images') {
          return { insert: insertImagesMock };
        }
        return {};
      });

      const result = await createPost(validParams);

      expect(supabase.from).toHaveBeenCalledWith('locations');
      expect(insertLocationMock).toHaveBeenCalledWith({
        title: 'Marilaque Coffee Stop',
        description: 'Scenic viewpoint and coffee along the highway',
        address: 'Tanay, Rizal',
        latitude: 14.6543,
        longitude: 121.3456,
        status_id: 'pending',
        created_by: 'user-123',
      });
      expect(supabase.from).toHaveBeenCalledWith('location_tags');
      expect(insertTagsMock).toHaveBeenCalledWith([
        { location_id: 'loc-123', tag_id: 'coffee_spot' },
      ]);
      expect(supabase.storage.from).toHaveBeenCalledWith('location_photos');
      expect(uploadMock).toHaveBeenCalled();
      expect(insertImagesMock).toHaveBeenCalled();
      expect(result).toEqual(mockLocation);
    });

    it('throws error when tagIds is empty or missing', async () => {
      await expect(
        createPost({ ...validParams, tagIds: [] })
      ).rejects.toThrow('At least one location tag is required.');
    });

    it('throws error when images is empty or missing', async () => {
      await expect(
        createPost({ ...validParams, images: [] })
      ).rejects.toThrow('At least one location photo is required.');
    });

    it('throws error and rolls back location when saving tags fails', async () => {
      const singleLocationMock = jest.fn().mockResolvedValue({
        data: { id: 'loc-123', title: validParams.title },
        error: null,
      });
      const selectLocationMock = jest.fn().mockReturnValue({ single: singleLocationMock });
      const insertLocationMock = jest.fn().mockReturnValue({ select: selectLocationMock });
      const deleteLocationMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) });

      const insertTagsMock = jest.fn().mockResolvedValue({
        error: { message: 'Foreign key constraint violated' },
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            insert: insertLocationMock,
            delete: deleteLocationMock,
          };
        }
        if (table === 'location_tags') {
          return { insert: insertTagsMock };
        }
        return {};
      });

      await expect(createPost(validParams)).rejects.toThrow(
        'Failed to save location tags: Foreign key constraint violated'
      );
      expect(deleteLocationMock).toHaveBeenCalled();
    });

    it('throws error and rolls back location when image upload fails', async () => {
      const singleLocationMock = jest.fn().mockResolvedValue({
        data: { id: 'loc-123', title: validParams.title },
        error: null,
      });
      const selectLocationMock = jest.fn().mockReturnValue({ single: singleLocationMock });
      const insertLocationMock = jest.fn().mockReturnValue({ select: selectLocationMock });
      const deleteLocationMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) });
      const insertTagsMock = jest.fn().mockResolvedValue({ error: null });

      const uploadMock = jest.fn().mockResolvedValue({
        error: { message: 'Network connection aborted' },
      });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: uploadMock,
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            insert: insertLocationMock,
            delete: deleteLocationMock,
          };
        }
        if (table === 'location_tags') {
          return { insert: insertTagsMock };
        }
        return {};
      });

      await expect(createPost(validParams)).rejects.toThrow(
        /Failed to upload location photo/
      );
      expect(deleteLocationMock).toHaveBeenCalled();
    });

    it('throws error and rolls back location when inserting location_images fails', async () => {
      const singleLocationMock = jest.fn().mockResolvedValue({
        data: { id: 'loc-123', title: validParams.title },
        error: null,
      });
      const selectLocationMock = jest.fn().mockReturnValue({ single: singleLocationMock });
      const insertLocationMock = jest.fn().mockReturnValue({ select: selectLocationMock });
      const deleteLocationMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) });
      const insertTagsMock = jest.fn().mockResolvedValue({ error: null });
      const insertImagesMock = jest.fn().mockResolvedValue({
        error: { message: 'Image insert failed' },
      });

      const uploadMock = jest.fn().mockResolvedValue({ error: null });
      const getPublicUrlMock = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://cdn.supabase.co/locations/photo1.jpg' },
      });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            insert: insertLocationMock,
            delete: deleteLocationMock,
          };
        }
        if (table === 'location_tags') {
          return { insert: insertTagsMock };
        }
        if (table === 'location_images') {
          return { insert: insertImagesMock };
        }
        return {};
      });

      await expect(createPost(validParams)).rejects.toThrow(
        'Failed to save location images: Image insert failed'
      );
      expect(deleteLocationMock).toHaveBeenCalled();
    });
  });

  describe('fetchUserPosts', () => {
    it('returns empty array if userId is empty', async () => {
      const result = await fetchUserPosts('');
      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('fetches posts with default newest sort order', async () => {
      const orderMock = jest.fn().mockResolvedValue({
        data: [mockLocation],
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await fetchUserPosts('user-123');

      expect(supabase.from).toHaveBeenCalledWith('locations');
      expect(eqMock).toHaveBeenCalledWith('created_by', 'user-123');
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual([mockLocation]);
    });

    it('applies title and oldest sort orders correctly', async () => {
      const orderMock = jest.fn().mockResolvedValue({
        data: [mockLocation],
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      await fetchUserPosts('user-123', 'oldest');
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });

      await fetchUserPosts('user-123', 'title');
      expect(orderMock).toHaveBeenCalledWith('title', { ascending: true });

      await fetchUserPosts('user-123', 'status');
      expect(orderMock).toHaveBeenCalledWith('status_id', { ascending: true });
    });

    it('logs error and returns empty array on Supabase error', async () => {
      const orderMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await fetchUserPosts('user-123');

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch user posts:',
        'Connection timeout'
      );
    });

    it('catches and logs unexpected exceptions', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Crash');
      });

      const result = await fetchUserPosts('user-123');
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Unexpected error in fetchUserPosts:',
        expect.any(Error)
      );
    });
  });

  describe('fetchPostById', () => {
    it('returns null if postId is empty', async () => {
      const result = await fetchPostById('');
      expect(result).toBeNull();
    });

    it('returns post details when found', async () => {
      const maybeSingleMock = jest.fn().mockResolvedValue({
        data: mockLocation,
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await fetchPostById('loc-123');

      expect(supabase.from).toHaveBeenCalledWith('locations');
      expect(eqMock).toHaveBeenCalledWith('id', 'loc-123');
      expect(result).toEqual(mockLocation);
    });

    it('returns null when post query encounters an error', async () => {
      const maybeSingleMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Post not found' },
      });
      const eqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await fetchPostById('loc-999');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch post by ID:',
        'Post not found'
      );
    });
  });

  describe('deletePost', () => {
    it('returns error if postId or userId is missing', async () => {
      const res1 = await deletePost('', 'user-123');
      expect(res1.success).toBe(false);

      const res2 = await deletePost('loc-123', '');
      expect(res2.success).toBe(false);
    });

    it('deletes post successfully when owned by user', async () => {
      const eqUserMock = jest.fn().mockResolvedValue({ error: null });
      const eqPostMock = jest.fn().mockReturnValue({ eq: eqUserMock });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqPostMock });
      (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

      const result = await deletePost('loc-123', 'user-123');

      expect(supabase.from).toHaveBeenCalledWith('locations');
      expect(deleteMock).toHaveBeenCalled();
      expect(eqPostMock).toHaveBeenCalledWith('id', 'loc-123');
      expect(eqUserMock).toHaveBeenCalledWith('created_by', 'user-123');
      expect(result).toEqual({ success: true });
    });

    it('returns success false when deletion returns error', async () => {
      const eqUserMock = jest.fn().mockResolvedValue({
        error: { message: 'Cannot delete approved post' },
      });
      const eqPostMock = jest.fn().mockReturnValue({ eq: eqUserMock });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqPostMock });
      (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

      const result = await deletePost('loc-123', 'user-123');

      expect(result.success).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to delete post:',
        'Cannot delete approved post'
      );
    });
  });

  describe('uploadLocationPhoto', () => {
    it('uploads base64 image data and returns public URL', async () => {
      const uploadMock = jest.fn().mockResolvedValue({ error: null });
      const getPublicUrlMock = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://cdn.supabase.co/locations/uploaded.jpg' },
      });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      });

      const url = await uploadLocationPhoto(
        'file:///test.jpg',
        'user-123',
        'loc-123',
        'dGVzdA=='
      );

      expect(supabase.storage.from).toHaveBeenCalledWith('location_photos');
      expect(uploadMock).toHaveBeenCalled();
      expect(url).toBe('https://cdn.supabase.co/locations/uploaded.jpg');
    });

    it('throws error when storage upload fails', async () => {
      const uploadMock = jest.fn().mockResolvedValue({
        error: { message: 'Storage quota reached' },
      });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: uploadMock,
      });

      await expect(
        uploadLocationPhoto('file:///test.jpg', 'user-123', 'loc-123', 'dGVzdA==')
      ).rejects.toThrow('Location photo upload failed: Storage quota reached');
    });
  });
});
