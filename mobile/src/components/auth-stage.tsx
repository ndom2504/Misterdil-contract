import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '@/lib/theme';

const HERO = require('../../assets/images/hero-office.jpg');
const LOGO = require('../../assets/images/logo.png');

export function BrandMark() {
  return (
    <View style={styles.brand}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Text style={styles.brandName}>Misterdil</Text>
      <Text style={styles.brandSlogan}>Collaboration smart</Text>
    </View>
  );
}

export function AuthStage({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <ImageBackground source={HERO} style={styles.background} resizeMode="cover">
      <StatusBar style="light" />
      <View style={styles.shade} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={styles.header}>
                <BrandMark />
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              {children}
              {footer}
              <View style={styles.note}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
                <Text style={styles.noteText}>
                  <Text style={{ fontWeight: '600', color: colors.text }}>Vos données sont protégées.</Text> L'accès reste limité aux personnes invitées dans chaque espace.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#07111c' },
  shade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(7, 17, 28, 0.82)' },
  content: { flexGrow: 1, justifyContent: 'center', padding: space.lg },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    gap: space.lg,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
  header: { alignItems: 'center', marginBottom: space.xs },
  brand: { alignItems: 'center' },
  logo: { width: 76, height: 44 },
  brandName: { marginTop: 4, fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  brandSlogan: { fontSize: 11, color: colors.faint },
  title: { marginTop: 20, fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { marginTop: 4, maxWidth: 300, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  note: { flexDirection: 'row', gap: space.md, backgroundColor: '#f4f8ff', borderRadius: 16, padding: space.lg },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#3f4854' },
});
