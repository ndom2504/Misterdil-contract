import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/lib/theme';

function CreateButton() {
  return (
    <View style={styles.createSlot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nouvelle entente"
        onPress={() => router.push('/nouveau')}
        style={({ pressed }) => [styles.create, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.faint,
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ententes',
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color, size }) => <Ionicons name="folder-open-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="creer"
        options={{
          title: 'Nouvelle entente',
          tabBarButton: () => <CreateButton />,
        }}
      />
      <Tabs.Screen
        name="discussions"
        options={{
          title: 'Discussions',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  create: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -18,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.card,
    shadowColor: colors.navy,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
