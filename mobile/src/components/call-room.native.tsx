import { Ionicons } from '@expo/vector-icons';
import {
  AudioSession,
  LiveKitRoom,
  useConnectionState,
  useIsMuted,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from '@livekit/react-native';
import { ConnectionState, Track, type Participant } from 'livekit-client';
import { useEffect, useState } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui';
import { colors, space } from '@/lib/theme';

export type CallRoomProps = { url: string; token: string; title: string; onLeave: () => void };

async function microphoneAllowed() {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Microphone',
    message: 'Misterdil a besoin du microphone pour les appels audio avec les parties prenantes.',
    buttonPositive: 'Autoriser',
    buttonNegative: 'Refuser',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function CallRoom({ url, token, title, onLeave }: CallRoomProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await microphoneAllowed())) {
        if (!cancelled) setError("L'accès au microphone est refusé. Autorisez-le dans les réglages du téléphone pour participer à l'appel.");
        return;
      }
      await AudioSession.startAudioSession();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
      void AudioSession.stopAudioSession();
    };
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="mic-off-outline" size={40} color="#fff" />
        <Text style={styles.notice}>{error}</Text>
        <Button label="Retour" variant="secondary" onPress={onLeave} />
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio
      video={false}
      onDisconnected={onLeave}
      onError={() => setError("L'appel a été interrompu. Vérifiez votre connexion et réessayez.")}>
      <Stage title={title} />
    </LiveKitRoom>
  );
}

function useElapsed(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function Stage({ title }: { title: string }) {
  const room = useRoomContext();
  const state = useConnectionState();
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [speaker, setSpeaker] = useState(true);
  const connected = state === ConnectionState.Connected;
  const elapsed = useElapsed(connected);

  async function toggleSpeaker() {
    const next = !speaker;
    setSpeaker(next);
    const output = Platform.OS === 'ios' ? (next ? 'force_speaker' : 'default') : next ? 'speaker' : 'earpiece';
    await AudioSession.selectAudioOutput(output).catch(() => {});
  }

  const status =
    state === ConnectionState.Connecting
      ? 'Connexion…'
      : state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting
        ? 'Reconnexion…'
        : connected
          ? participants.length > 1
            ? elapsed
            : 'En attente des autres parties…'
          : 'Appel terminé';

  return (
    <View style={styles.stage}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.status}>{status}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {participants.map((participant) => (
          <Tile key={participant.identity} participant={participant} isLocal={participant.identity === localParticipant.identity} />
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <Control
          icon={isMicrophoneEnabled ? 'mic' : 'mic-off'}
          label={isMicrophoneEnabled ? 'Micro' : 'Muet'}
          active={!isMicrophoneEnabled}
          onPress={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Raccrocher" onPress={() => void room.disconnect()} style={styles.hangup}>
          <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>
        <Control icon={speaker ? 'volume-high' : 'ear-outline'} label={speaker ? 'Haut-parleur' : 'Écouteur'} active={!speaker} onPress={() => void toggleSpeaker()} />
      </View>
    </View>
  );
}

function avatarOf(participant: Participant) {
  try {
    const data = JSON.parse(participant.metadata || '{}') as { avatarUrl?: unknown };
    return typeof data.avatarUrl === 'string' ? data.avatarUrl : '';
  } catch {
    return '';
  }
}

function Tile({ participant, isLocal }: { participant: Participant; isLocal: boolean }) {
  const speaking = useIsSpeaking(participant);
  const muted = useIsMuted({ participant, source: Track.Source.Microphone });
  const name = participant.name || participant.identity;
  return (
    <View style={styles.tile}>
      <View style={[styles.ring, speaking && styles.ringActive]}>
        <Avatar name={name} url={avatarOf(participant)} size={76} />
        {muted ? (
          <View style={styles.mutedBadge}>
            <Ionicons name="mic-off" size={13} color="#fff" />
          </View>
        ) : null}
      </View>
      <Text style={styles.tileName} numberOfLines={1}>
        {isLocal ? 'Vous' : name}
      </Text>
    </View>
  );
}

function Control({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  return (
    <View style={styles.control}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.controlButton, active && styles.controlActive]}>
        <Ionicons name={icon} size={26} color={active ? colors.navy : '#fff'} />
      </Pressable>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  notice: { color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  stage: { flex: 1 },
  header: { alignItems: 'center', gap: 6, paddingHorizontal: space.xl, paddingTop: space.xl },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  status: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xl, padding: space.xl, paddingTop: space.xl * 2 },
  tile: { width: 104, alignItems: 'center', gap: space.sm },
  ring: { padding: 4, borderRadius: 50, borderWidth: 3, borderColor: 'transparent' },
  ringActive: { borderColor: '#4ade80' },
  mutedBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.navy,
  },
  tileName: { color: '#fff', fontSize: 14, fontWeight: '600', maxWidth: 104 },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingVertical: space.xl },
  control: { alignItems: 'center', gap: 6, width: 90 },
  controlButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  controlActive: { backgroundColor: '#fff' },
  controlLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  hangup: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
});
