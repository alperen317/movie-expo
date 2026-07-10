import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

interface AuthTextInputProps extends TextInputProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  isPassword?: boolean;
}

export function AuthTextInput({ icon, isPassword, ...props }: AuthTextInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="justify-center">
      <MaterialIcons
        name={icon}
        size={20}
        color="#A1A1AA"
        style={{ position: 'absolute', left: 16, zIndex: 1 }}
      />
      <TextInput
        placeholderTextColor="#A1A1AA80"
        secureTextEntry={isPassword && !showPassword}
        className={`rounded-lg border border-glass-border bg-surface/50 py-4 pl-12 font-sans text-text-primary focus:border-primary-container ${
          isPassword ? 'pr-12' : 'pr-4'
        }`}
        {...props}
      />
      {isPassword && (
        <Pressable
          onPress={() => setShowPassword((value) => !value)}
          style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }}
        >
          <MaterialIcons
            name={showPassword ? 'visibility-off' : 'visibility'}
            size={20}
            color="#A1A1AA"
          />
        </Pressable>
      )}
    </View>
  );
}
