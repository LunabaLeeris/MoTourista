import { supabase } from '../lib/supabase';
import { LocationWithDetails } from '../types/database';
import {
  ImageUploadPayload,
  uploadImageToStorage,
  getExtensionFromMimeOrUri,
} from './imageService';
import { validateCoordinates } from './locationService';

// Input payload for uploaded post photos, reusing ImageUploadPayload from imageService.
export type PostImageInput = ImageUploadPayload;

// Parameters required to create a new rider hotspot post.
export interface CreatePostParams {
  userId: string;
  title: string;
  description?: string;
  address?: string;
  latitude: number;
  longitude: number;
  tagIds: string[];
  images: PostImageInput[];
}

// Available sort orders for user posts.
export type PostSortOption = 'newest' | 'oldest' | 'title' | 'status';

// Upload location image to the location_photos storage bucket using shared imageService helper.
export async function uploadLocationPhoto(
  localUri: string,
  userId: string,
  locationId: string,
  base64Data?: string | null,
  mimeType?: string | null,
  fileSize?: number
): Promise<string> {
  const fileExt = getExtensionFromMimeOrUri(mimeType, localUri);
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `${userId}/${locationId}/${fileName}`;

  try {
    return await uploadImageToStorage('location_photos', filePath, {
      uri: localUri,
      base64: base64Data,
      mimeType,
      fileSize,
    });
  } catch (error: any) {
    if (error.message?.includes('Upload failed to location_photos:')) {
      throw new Error(
        `Location photo upload failed: ${error.message.replace('Upload failed to location_photos: ', '')}`
      );
    }
    if (error.message?.includes('Failed to retrieve cloud URL')) {
      throw new Error('Failed to obtain public URL for location photo.');
    }
    throw error;
  }
}

// Create a new location post with tags and images.
export async function createPost(params: CreatePostParams): Promise<LocationWithDetails> {
  if (!params.userId) {
    throw new Error('User ID is required to create a post.');
  }

  const trimmedTitle = params.title?.trim();
  if (!trimmedTitle) {
    throw new Error('Location title is required.');
  }

  // Validate coordinates using locationService guard clause.
  validateCoordinates(params.latitude, params.longitude);

  if (!params.tagIds || params.tagIds.length === 0) {
    throw new Error('At least one location tag is required.');
  }

  if (!params.images || params.images.length === 0) {
    throw new Error('At least one location photo is required.');
  }

  // Insert base location record with default pending status.
  const { data: locationData, error: locationError } = await supabase
    .from('locations')
    .insert({
      title: trimmedTitle,
      description: params.description?.trim() || '',
      address: params.address?.trim() || '',
      latitude: params.latitude,
      longitude: params.longitude,
      status_id: 'pending',
      created_by: params.userId,
    })
    .select()
    .single();

  if (locationError || !locationData) {
    throw new Error(locationError?.message || 'Failed to create location post.');
  }

  // Rollback helper to clean up location row if related insertions fail.
  const rollbackLocation = async () => {
    try {
      await supabase.from('locations').delete().eq('id', locationData.id);
    } catch {
      // Ignore rollback failure.
    }
  };

  // Insert location tags.
  const tagRows = params.tagIds.map((tagId) => ({
    location_id: locationData.id,
    tag_id: tagId,
  }));

  const { error: tagsError } = await supabase
    .from('location_tags')
    .insert(tagRows);

  if (tagsError) {
    await rollbackLocation();
    throw new Error(`Failed to save location tags: ${tagsError.message}`);
  }

  // Upload and record location images.
  const uploadedRows: {
    location_id: string;
    image_url: string;
    caption: string;
    display_order: number;
  }[] = [];

  let lastUploadError: string | null = null;

  for (let i = 0; i < params.images.length; i++) {
    const img = params.images[i];
    try {
      const publicUrl = await uploadLocationPhoto(
        img.uri,
        params.userId,
        locationData.id,
        img.base64,
        img.mimeType,
        img.fileSize
      );
      uploadedRows.push({
        location_id: locationData.id,
        image_url: publicUrl,
        caption: '',
        display_order: i + 1,
      });
    } catch (uploadErr: any) {
      lastUploadError = uploadErr.message || 'Photo upload failed.';
      console.error('Error uploading location photo:', lastUploadError);
    }
  }

  if (uploadedRows.length === 0) {
    await rollbackLocation();
    throw new Error(
      lastUploadError
        ? `Failed to upload location photo: ${lastUploadError}`
        : 'Failed to upload location photo. Please try again.'
    );
  }

  const { error: imagesError } = await supabase
    .from('location_images')
    .insert(uploadedRows);

  if (imagesError) {
    await rollbackLocation();
    throw new Error(`Failed to save location images: ${imagesError.message}`);
  }

  // Return complete post details.
  const completePost = await fetchPostById(locationData.id);
  if (completePost) {
    return completePost;
  }

  return locationData as LocationWithDetails;
}

// Fetch all posts created by a specific user with related details.
export async function fetchUserPosts(
  userId: string,
  sortBy: PostSortOption = 'newest'
): Promise<LocationWithDetails[]> {
  if (!userId) {
    return [];
  }

  try {
    let query = supabase
      .from('locations')
      .select(`
        *,
        location_statuses (*),
        location_images (*),
        location_tags (
          *,
          tags (*)
        ),
        location_hearts (*),
        location_visits (*),
        profiles:profiles!created_by (*)
      `)
      .eq('created_by', userId);

    if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortBy === 'title') {
      query = query.order('title', { ascending: true });
    } else if (sortBy === 'status') {
      query = query.order('status_id', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch user posts:', error.message);
      return [];
    }

    return (data as LocationWithDetails[]) || [];
  } catch (err: any) {
    console.error('Unexpected error in fetchUserPosts:', err);
    return [];
  }
}

// Fetch a single location post by its ID with full relations.
export async function fetchPostById(
  postId: string
): Promise<LocationWithDetails | null> {
  if (!postId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('locations')
      .select(`
        *,
        location_statuses (*),
        location_images (*),
        location_tags (
          *,
          tags (*)
        ),
        location_hearts (*),
        location_visits (*),
        profiles:profiles!created_by (*)
      `)
      .eq('id', postId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch post by ID:', error.message);
      return null;
    }

    return (data as LocationWithDetails) || null;
  } catch (err: any) {
    console.error('Unexpected error in fetchPostById:', err);
    return null;
  }
}

// Delete an unapproved post owned by the authenticated user.
export async function deletePost(
  postId: string,
  userId: string
): Promise<{ success: boolean; error?: any }> {
  if (!postId || !userId) {
    return {
      success: false,
      error: new Error('Post ID and User ID are required.'),
    };
  }

  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', postId)
      .eq('created_by', userId);

    if (error) {
      console.error('Failed to delete post:', error.message);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in deletePost:', err);
    return { success: false, error: err };
  }
}
