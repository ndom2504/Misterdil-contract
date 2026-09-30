import { useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantPanel } from '@/components/assistant-panel';
import { colors } from '@/lib/theme';

// The bottom inset lives on the SafeAreaView: KeyboardAvoidingView overwrites its own paddingBottom.
export default function AssistantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={insets.top + (Platform.OS === 'ios' ? 44 : 56)}>
        <AssistantPanel documentId={id} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
