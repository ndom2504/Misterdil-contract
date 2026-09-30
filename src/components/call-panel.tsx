"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useIsMuted,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, Track, type Participant } from "livekit-client";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/cn";

export type CallCredentials = { url: string; token: string };

export default function CallPanel({ credentials, onLeave }: { credentials: CallCredentials; onLeave: () => void }) {
  const [error, setError] = useState("");
  return (
    <div className="rounded-2xl bg-[#0b1f3a] p-5 text-white">
      <LiveKitRoom
        serverUrl={credentials.url}
        token={credentials.token}
        connect
        audio
        video={false}
        onDisconnected={onLeave}
        onError={() => setError("L'appel a été interrompu. Vérifiez votre connexion et réessayez.")}
        onMediaDeviceFailure={() => setError("Le microphone est inaccessible. Autorisez-le dans votre navigateur.")}>
        <RoomAudioRenderer />
        <Stage />
      </LiveKitRoom>
      {error ? <p className="mt-3 text-sm text-[#fecaca]">{error}</p> : null}
    </div>
  );
}

function Stage() {
  const room = useRoomContext();
  const state = useConnectionState();
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [seconds, setSeconds] = useState(0);
  const connected = state === ConnectionState.Connected;

  useEffect(() => {
    if (!connected) return;
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [connected]);

  const status =
    state === ConnectionState.Connecting
      ? "Connexion…"
      : state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting
        ? "Reconnexion…"
        : connected
          ? participants.length > 1
            ? `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
            : "En attente des autres parties…"
          : "Appel terminé";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Appel audio</p>
        <p className="text-sm text-white/70">{status}</p>
      </div>
      <div className="flex flex-wrap gap-5">
        {participants.map((participant) => (
          <Tile key={participant.identity} participant={participant} isLocal={participant.identity === localParticipant.identity} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          className={cn("inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium", isMicrophoneEnabled ? "bg-white/15 text-white hover:bg-white/25" : "bg-white text-[#0b1f3a]")}>
          {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          {isMicrophoneEnabled ? "Couper le micro" : "Réactiver le micro"}
        </button>
        <button type="button" onClick={() => void room.disconnect()} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#dc2626] px-4 text-sm font-medium text-white hover:bg-[#b91c1c]">
          <PhoneOff className="h-4 w-4" />
          Raccrocher
        </button>
      </div>
    </div>
  );
}

function avatarOf(participant: Participant) {
  try {
    const data = JSON.parse(participant.metadata || "{}") as { avatarUrl?: unknown };
    return typeof data.avatarUrl === "string" ? data.avatarUrl : "";
  } catch {
    return "";
  }
}

function Tile({ participant, isLocal }: { participant: Participant; isLocal: boolean }) {
  const speaking = useIsSpeaking(participant);
  const muted = useIsMuted({ participant, source: Track.Source.Microphone });
  const name = participant.name || participant.identity;
  return (
    <div className="flex w-24 flex-col items-center gap-2">
      <div className={cn("relative rounded-full border-[3px] p-1", speaking ? "border-[#4ade80]" : "border-transparent")}>
        <UserAvatar name={name} url={avatarOf(participant)} size={64} />
        {muted ? (
          <span className="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0b1f3a] bg-[#dc2626]">
            <MicOff className="h-3 w-3" />
          </span>
        ) : null}
      </div>
      <p className="max-w-24 truncate text-sm font-medium">{isLocal ? "Vous" : name}</p>
    </div>
  );
}
