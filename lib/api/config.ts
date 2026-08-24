export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('Missing EXPO_PUBLIC_API_BASE_URL. Add it to your .env file and restart Expo.');
}
