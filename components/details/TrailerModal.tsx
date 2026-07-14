import { MaterialIcons } from '@expo/vector-icons';
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

import { useToastStore } from '../../stores/toast.store';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface TrailerModalProps {
  visible: boolean;
  onClose: () => void;
  trailerKey: string | null;
}

function openUrlSafely(url: string) {
  Linking.openURL(url).catch(() => {
    useToastStore.getState().show('Could not open link', 'error-outline');
  });
}

export function TrailerModal({ visible, onClose, trailerKey }: TrailerModalProps) {
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
                  uri: `https://www.youtube.com/embed/${trailerKey}?autoplay=1&playsinline=1&modestbranding=1&rel=0`,
                }}
                style={{ flex: 1, backgroundColor: '#000000' }}
                allowsFullscreenVideo
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
            className="h-10 flex-row items-center gap-2 rounded-full border border-glass-border bg-background-blur px-4"
          >
            <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
            <Text className="font-sans-semibold text-caption text-text-primary">
              Open in YouTube
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
          >
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}
