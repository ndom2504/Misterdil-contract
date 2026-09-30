import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { absoluteUrl, authHeaders } from '@/lib/api';
import { colorFor, initials } from '@/lib/format';

type Props = { name: string; url?: string; size?: number; style?: StyleProp<ViewStyle> };

export function Avatar({ name, url, size = 40, style }: Props) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    return (
      <View style={[box, styles.frame, style]}>
        <Image source={{ uri: absoluteUrl(url), headers: authHeaders() }} style={box} contentFit="cover" transition={150} />
      </View>
    );
  }
  return (
    <View style={[box, styles.frame, { backgroundColor: colorFor(name) }, style]}>
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.38) }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { color: '#fff', fontWeight: '700' },
});
