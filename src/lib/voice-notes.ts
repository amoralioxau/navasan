import * as FileSystem from 'expo-file-system/legacy';

const VOICE_NOTES_DIR = `${FileSystem.documentDirectory}voice-notes/`;

export async function ensureVoiceNotesDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(VOICE_NOTES_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(VOICE_NOTES_DIR, {
        intermediates: true,
      });
    }
  } catch (e) {
    console.log('ensureVoiceNotesDir error:', e);
  }
}

export function generateVoiceNotePath(): string {
  return `${VOICE_NOTES_DIR}note-${Date.now()}.m4a`;
}

export async function deleteVoiceNote(uri: string): Promise<void> {
  try {
    if (!uri) return;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (e) {
    console.log('deleteVoiceNote error:', e);
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}