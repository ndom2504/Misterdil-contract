import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { colors, radius, space } from '@/lib/theme';
import type { SectionPerson, SectionSocial } from '@/lib/types';

export function AvatarStack({ people, size = 24, max = 5 }: { people: SectionPerson[]; size?: number; max?: number }) {
  if (!people.length) return null;
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <View style={styles.stack} accessibilityLabel={`Réactions de ${people.map((item) => item.name).join(', ')}`}>
      {shown.map((person, index) => (
        <Avatar
          key={person.id}
          name={person.name}
          url={person.avatarUrl}
          size={size}
          style={[styles.stackItem, { marginLeft: index ? -size / 3 : 0, zIndex: max - index }]}
        />
      ))}
      {extra > 0 ? (
        <View style={[styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 3 }]}>
          <Text style={styles.moreText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function SocialCounts({ social }: { social: SectionSocial }) {
  return (
    <View style={styles.counts}>
      <View style={styles.count}>
        <Ionicons name={social.liked ? 'heart' : 'heart-outline'} size={14} color={social.liked ? '#e11d48' : colors.faint} />
        <Text style={styles.countText}>{social.likes}</Text>
      </View>
      <View style={styles.count}>
        <Ionicons name="chatbubble-outline" size={13} color={colors.faint} />
        <Text style={styles.countText}>{social.comments}</Text>
      </View>
      <View style={styles.count}>
        <Ionicons name="eye-outline" size={14} color={colors.faint} />
        <Text style={styles.countText}>{social.views}</Text>
      </View>
    </View>
  );
}

type BarProps = {
  social: SectionSocial;
  busy?: boolean;
  onLike: () => void;
  onComment: () => void;
};

export function SocialBar({ social, busy, onLike, onComment }: BarProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function like() {
    if (!social.liked) {
      scale.setValue(0.6);
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
    }
    onLike();
  }

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: social.liked, disabled: busy }}
        accessibilityLabel={social.liked ? "Retirer j'aime" : "J'aime"}
        disabled={busy}
        onPress={like}
        style={({ pressed }) => [styles.action, social.liked && styles.actionLiked, pressed && { opacity: 0.8 }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name={social.liked ? 'heart' : 'heart-outline'} size={19} color={social.liked ? '#e11d48' : colors.muted} />
        </Animated.View>
        <Text style={[styles.actionText, social.liked && { color: '#e11d48' }]}>
          {social.likes ? social.likes : ''} J&apos;aime
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Commenter"
        onPress={onComment}
        style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}>
        <Ionicons name="chatbubble-outline" size={18} color={colors.muted} />
        <Text style={styles.actionText}>{social.comments ? social.comments : ''} Commenter</Text>
      </Pressable>
      <View style={styles.views} accessibilityLabel={`${social.views} vues`}>
        <Ionicons name="eye-outline" size={18} color={colors.faint} />
        <Text style={styles.viewsText}>{social.views}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackItem: { borderWidth: 2, borderColor: colors.card },
  more: { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card },
  moreText: { fontSize: 10, fontWeight: '700', color: colors.muted },
  counts: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  count: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countText: { fontSize: 12, color: colors.faint, fontWeight: '600' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 6,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, paddingVertical: 8, borderRadius: radius.sm },
  actionLiked: { backgroundColor: '#ffe4ea' },
  actionText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  views: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm },
  viewsText: { fontSize: 13, color: colors.faint, fontWeight: '600' },
});
