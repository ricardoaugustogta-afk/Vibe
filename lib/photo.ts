import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

const MAX_BYTES = 200 * 1024;
const MAX_DIMENSION = 1080;

export async function pickAndCompressPhoto(): Promise<{ uri: string; base64: string } | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('permission_denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    base64: false,
    exif: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  let uri = result.assets[0].uri;
  const compressions = [0.8, 0.6, 0.4, 0.25, 0.15];

  for (const quality of compressions) {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_DIMENSION, height: MAX_DIMENSION } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    uri = manipulated.uri;
    if (manipulated.base64) {
      const sizeBytes = Math.ceil((manipulated.base64.length * 3) / 4);
      if (sizeBytes <= MAX_BYTES) {
        return { uri: manipulated.uri, base64: manipulated.base64 };
      }
    }
  }

  const finalResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 600 } }],
    { compress: 0.15, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (finalResult.base64) {
    return { uri: finalResult.uri, base64: finalResult.base64 };
  }
  throw new Error('compress_failed');
}

export async function checkPhotoNSFW(base64: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('check-image', {
      body: JSON.stringify({ image: base64 }),
    });
    if (error) return false;
    if (data && data.unsafe) return true;
    return false;
  } catch {
    return false;
  }
}

export async function uploadCommentPhoto(userId: string, base64: string): Promise<string> {
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from('event-photos')
    .upload(fileName, decode(base64), {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw new Error('upload_failed');

  const { data } = supabase.storage.from('event-photos').getPublicUrl(fileName);
  return data.publicUrl;
}

function decode(b64: string): Uint8Array {
  const clean = b64.replace(/^data:image\/jpeg;base64,/, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
