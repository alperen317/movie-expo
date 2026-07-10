import { BlurView } from 'expo-blur';
// import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// const BACKGROUND_IMAGE =
//   'https://lh3.googleusercontent.com/aida-public/AB6AXuC1g7yJz8mxQ3qamk_ETNUp9zK9QM9MDP0LjYMvP2sXWxea9ZeOTy5cjr-Ex6qOlSFZYzMz9IDz3Dtjen8tzgTZK0cb-kNIZQjwyMKivXMPMkfWZI7tNwBKHqXgxIDk8zjUUTc5NFrVKGhOxWUNS6sZfDqr-nc_oOEC1A3WkWy-RvYSBLsR8Lk3gm6PQFx0CORqzorDD7VBzJaGLxCJnURnqNvky_boMPXWs2ihyTbTWyF1lxa0L5PK';

export function AuthBackground({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      {/* <Image source={{ uri: BACKGROUND_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" /> */}
      <LinearGradient
        colors={['rgba(19,19,19,0.4)', 'rgba(19,19,19,0.85)', '#131313']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center px-margin-mobile"
        >
          <BlurView
            intensity={40}
            tint="dark"
            style={{ width: '100%', maxWidth: 400, borderRadius: 16, overflow: 'hidden' }}
          >
            <View className="items-center border border-glass-border bg-background-blur px-8 py-10">
              {children}
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
