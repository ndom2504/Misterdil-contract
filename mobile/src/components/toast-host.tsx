import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { playChime } from '@/lib/chime';
import { appRoute } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import { showToast, subscribeToasts, type Toast } from '@/lib/toast';

const VISIBLE_MS = 3800;

const ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  REACTION: { name: 'heart', color: '#e11d48' },
  COMMENT: { name: 'chatbubble-ellipses', color: colors.brand },
  MESSAGE: { name: 'chatbubbles', color: colors.brand },
  CALL: { name: 'call', color: colors.success },
};

// Foreground pushes become an in-app pop-up with the Misterdil chime; a push about the
// screen already open (the conversation being read, for instance) stays silent.
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { refresh } = useAuth();
  const [toast, setToast] = useState<Toast | null>(null);
  const offset = useRef(new Animated.Value(-160)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const href = typeof content.data?.href === 'string' ? content.data.href : '';
      const kind = typeof content.data?.kind === 'string' ? content.data.kind : '';
      refresh().catch(() => {});
      if (href && appRoute(href) === pathRef.current) return;
      showToast({ title: content.title ?? 'Misterdil', body: content.body ?? '', href, kind });
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    const hide = () => {
      Animated.timing(offset, { toValue: -160, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    };
    const unsubscribe = subscribeToasts((next) => {
      setToast(next);
      playChime();
      offset.setValue(-160);
      Animated.spring(offset, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }).start();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(hide, VISIBLE_MS);
    });
    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [offset]);

  if (!toast) return null;
  const icon = ICONS[toast.kind ?? ''] ?? { name: 'notifications' as const, color: colors.brand };

  function open() {
    if (!toast) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(offset, { toValue: -160, duration: 180, useNativeDriver: true }).start(() => setToast(null));
    if (toast.href) router.push(appRoute(toast.href));
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + space.sm, transform: [{ translateY: offset }] }]}>
      <Pressable accessibilityRole="button" onPress={open} style={({ pressed }) => [styles.toast, pressed && { opacity: 0.9 }]}>
        <View style={[styles.icon, { backgroundColor: `${icon.color}1a` }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.body ? (
            <Text style={styles.body} numberOfLines={2}>
              {toast.body}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.md, right: space.md, zIndex: 1000, elevation: 12 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#0b1f3a',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  body: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
});
