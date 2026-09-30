import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const SOURCE = require('../../assets/sounds/misterdil_pop.wav');

let player: AudioPlayer | null = null;

// A missing native module (older build) or a busy audio session must never break the action.
export function playChime() {
  try {
    player ??= createAudioPlayer(SOURCE);
    player.volume = 0.6;
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    player = null;
  }
}
