import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { space } from '@/lib/theme';

export type CallRoomProps = { url: string; token: string; title: string; onLeave: () => void };

export function CallRoom({ onLeave }: CallRoomProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>Les appels audio sont disponibles dans l&apos;application Android et iOS.</Text>
      <Button label="Retour" variant="secondary" onPress={onLeave} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', lineHeight: 22 },
});
