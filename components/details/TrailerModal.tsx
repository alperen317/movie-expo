import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import i18n from '../../lib/i18n';
import { nextTrailerAction, youtubeWatchUrl } from '../../lib/tmdb/trailer';
import { useToastStore } from '../../stores/toast.store';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface TrailerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Keys to try in order; see lib/tmdb/trailer.ts. */
  trailerKeys: string[];
}

function openUrlSafely(url: string) {
  Linking.openURL(url).catch(() => {
    useToastStore.getState().show(i18n.t('toasts.couldNotOpenLink'), 'error-outline');
  });
}

// Built on the IFrame Player API rather than a bare <iframe> so playback
// failures are observable. A plain iframe reports errors only inside its own
// document -- YouTube paints an error frame and React Native never hears about
// it, so there is no way to retry or hand off, which is what made a
// non-embeddable trailer a dead end. The API's onError crosses back over
// postMessage instead.
//
// Loading the embed as HTML with a baseUrl (rather than source.uri) makes the
// WebView present a real youtube.com origin/Referer, which the player requires;
// `origin` in playerVars must match that baseUrl. `host` keeps the actual video
// request on youtube-nocookie.com.
function buildTrailerHtml(trailerKey: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden;}#player{position:absolute;top:0;left:0;width:100%;height:100%;}</style>
  </head>
  <body>
    <div id="player"></div>
    <script>
      function post(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }
      window.onYouTubeIframeAPIReady = function () {
        new YT.Player('player', {
          videoId: ${JSON.stringify(trailerKey)},
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            origin: 'https://www.youtube.com'
          },
          events: {
            onReady: function (event) { event.target.playVideo(); post({ type: 'ready' }); },
            onError: function (event) { post({ type: 'error', code: String(event.data) }); }
          }
        });
      };
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = function () { post({ type: 'error', code: 'api-load-failed' }); };
      document.head.appendChild(tag);
    </script>
  </body>
</html>`;
}

export function TrailerModal({ visible, onClose, trailerKeys }: TrailerModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // Which candidate is on screen. Errors walk this forward before giving up.
  const [attempt, setAttempt] = useState(0);

  // Every open starts from the best candidate again -- a failure last time may
  // have been transient, and the title itself can change between opens.
  useEffect(() => {
    if (visible) setAttempt(0);
  }, [visible]);

  const trailerKey = trailerKeys[attempt] ?? null;

  const handleFailure = (code: string) => {
    // Surfaced for triage: YouTube's documented IFrame API codes are 2, 5, 100,
    // 101 and 150, but the player emits others in the wild, and the handling is
    // the same for all of them.
    console.warn(`[TrailerModal] playback failed (code ${code})`);
    const action = nextTrailerAction(trailerKeys, attempt);
    if (action.type === 'retry') {
      setAttempt(action.index);
      return;
    }
    onClose();
    if (action.type === 'external') {
      useToastStore.getState().show(i18n.t('toasts.trailerOpeningInYoutube'), 'open-in-new');
      openUrlSafely(youtubeWatchUrl(action.key));
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    let payload: { type?: string; code?: string };
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (payload.type === 'error') handleFailure(payload.code ?? 'unknown');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {visible && trailerKey && (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ width: windowWidth, height: (windowWidth * 9) / 16 }}>
              <WebView
                // Remounts on retry so the next candidate gets a clean player
                // instead of reusing the failed one's document.
                key={trailerKey}
                source={{
                  html: buildTrailerHtml(trailerKey),
                  baseUrl: 'https://www.youtube.com',
                }}
                originWhitelist={['*']}
                style={{ flex: 1, backgroundColor: '#000000' }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                onMessage={handleMessage}
                // A WebView that cannot load at all never reaches the player,
                // so it needs the same fallback path.
                onError={() => handleFailure('webview-error')}
                onHttpError={() => handleFailure('webview-http-error')}
                startInLoadingState
                renderLoading={() => (
                  <View
                    style={StyleSheet.absoluteFill}
                    className="items-center justify-center bg-black"
                  >
                    <ActivityIndicator color="#ffffff" />
                  </View>
                )}
              />
            </View>
          </View>
        )}

        {/* Rendered after the WebView so these stay tappable — on iOS a
            full-bleed WebView sibling can otherwise swallow touches meant
            for controls painted "above" it only in JS z-index terms. */}
        <View
          style={{ paddingTop: insets.top, marginTop: 12 }}
          className="absolute left-4 right-4 top-0 z-10 flex-row items-center justify-between"
        >
          <AnimatedPressable
            onPress={() => trailerKey && openUrlSafely(youtubeWatchUrl(trailerKey))}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.openInYoutube')}
            className="h-10 flex-row items-center gap-2 rounded-full border border-glass-border bg-background-blur px-4"
          >
            <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
            <Text className="font-sans-semibold text-caption text-text-primary">
              {t('components.trailer.openInYoutube')}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.close')}
            className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
          >
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}
