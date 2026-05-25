import { supabase } from './supabase';

const BUCKET = 'verse-media';

export type MediaType = 'photo' | 'voice';

export async function uploadVerseMedia(params: {
  userId: string;
  bookId: string;
  chapter: number;
  verse: number;
  localUri: string;
  mediaType: MediaType;
}): Promise<{ storagePath: string; fileType: string }> {
  const { userId, bookId, chapter, verse, localUri, mediaType } = params;

  const ext       = mediaType === 'photo' ? 'jpg' : 'm4a';
  const fileType  = mediaType === 'photo' ? 'image/jpeg' : 'audio/m4a';
  const timestamp = Date.now();
  const storagePath = `${userId}/${mediaType}/${bookId}/${chapter}/${verse}/${timestamp}.${ext}`;

  const arraybuffer = await fetch(localUri).then(r => r.arrayBuffer());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arraybuffer, { contentType: fileType, upsert: false });

  if (error) throw error;

  return { storagePath, fileType };
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
