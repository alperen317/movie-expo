import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';

// Matches the native splash background (app.json > expo-splash-screen), so the
// handoff from the native splash to this overlay has no visible seam.
const SPLASH_BACKGROUND = '#150D09';

// Trimmed to 2.5s and stripped of audio in the asset itself rather than at
// playback time -- a 10s splash reads as a frozen app, and a splash that makes
// noise is never what anyone wants. splash-video-source.mp4 is the untrimmed
// 10s original, kept for re-cutting a different window later; nothing requires
// it, and app.json sets no assetBundlePatterns, so it never ships.
//
//   ffmpeg -i assets/splash-video-source.mp4 -t 2.5 -an \
//     -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
//     -movflags +faststart assets/splash-video.mp4
const SPLASH_VIDEO = require('../../assets/splash-video.mp4');

interface SplashVideoProps {
  /** Called once when the clip ends, is skipped, or fails to load. */
  onFinish: () => void;
}

export function SplashVideo({ onFinish }: SplashVideoProps) {
  const player = useVideoPlayer(SPLASH_VIDEO, (instance) => {
    instance.muted = true;
    instance.loop = false;
    instance.play();
  });

  useEventListener(player, 'playToEnd', onFinish);

  // A clip that never becomes playable (corrupt asset, codec trouble on some
  // device) would otherwise hold the app behind this overlay forever, since
  // playToEnd never arrives. The app is what matters, not the intro.
  useEffect(() => {
    const timeout = setTimeout(onFinish, 4000);
    return () => clearTimeout(timeout);
  }, [onFinish]);

  return (
    <Pressable
      onPress={onFinish}
      accessibilityRole="button"
      accessibilityLabel="Skip intro"
      style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BACKGROUND }]}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        // The clip is already portrait at the phone's aspect ratio, so cover
        // fills the screen without letterboxing.
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        pointerEvents="none"
      />
    </Pressable>
  );
}
