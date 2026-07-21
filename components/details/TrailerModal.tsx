import { MaterialIcons } from '@expo/vector-icons';
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
import { WebView } from 'react-native-webview';

import i18n from '../../lib/i18n';
import { useToastStore } from '../../stores/toast.store';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface TrailerModalProps {
  visible: boolean;
  onClose: () => void;
  trailerKey: string | null;
}

function openUrlSafely(url: string) {
  Linking.openURL(url).catch(() => {
    useToastStore.getState().show(i18n.t('toasts.couldNotOpenLink'), 'error-outline');
  });
}

// Loading the embed URL directly via source.uri sends no Referer header,
// which YouTube's player now rejects with error 153. Loading it as an
// <iframe> with a baseUrl makes the WebView present a valid youtube.com
// origin/Referer, regardless of RN WebView version header support.
function buildTrailerHtml(trailerKey: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>html,body{margin:0;padding:0;background:#000;height:100%;}iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0;}</style>
  </head>
  <body>
    <iframe
      src="https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&playsinline=1&modestbranding=1&rel=0"
      allow="autoplay; encrypted-media; fullscreen"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  </body>
</html>`;
}

export function TrailerModal({ visible, onClose, trailerKey }: TrailerModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {visible && trailerKey && (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ width: windowWidth, height: (windowWidth * 9) / 16 }}>
              <WebView
                source={{
                  html: buildTrailerHtml(trailerKey),
                  baseUrl: 'https://www.youtube.com',
                }}
                originWhitelist={['*']}
                style={{ flex: 1, backgroundColor: '#000000' }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
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
            onPress={() =>
              trailerKey && openUrlSafely(`https://www.youtube.com/watch?v=${trailerKey}`)
            }
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
