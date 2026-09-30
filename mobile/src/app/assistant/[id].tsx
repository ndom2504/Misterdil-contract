import { useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantPanel } from '@/components/assistant-panel';
import { colors } from '@/lib/theme';

export default function AssistantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background, paddingBottom: insets.bottom }}
      behavior="padding"
      keyboardVerticalOffset={insets.top + (Platform.OS === 'ios' ? 44 : 56)}>
      <AssistantPanel documentId={id} />
    </KeyboardAvoidingView>
  );
}
