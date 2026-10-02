import { triggerHaptic } from '../components/Haptics'

let soundObject: any = null

export async function playKitchenChime() {
  // 1. Always give sensory feedback via haptics
  try {
    triggerHaptic.heavy()
  } catch {}


  // 2. Safely attempt audio playback without crashing if ExponentAV is absent in Expo Go
  try {
    // Dynamic require so missing native module doesn't crash app initialization
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoAv = require('expo-av')
    if (!expoAv?.Audio) return

    const { Audio } = expoAv

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    })

    if (soundObject) {
      try {
        await soundObject.unloadAsync()
      } catch {}
    }

    const chimeUri = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
    const { sound } = await Audio.Sound.createAsync(
      { uri: chimeUri },
      { shouldPlay: true, volume: 1.0 }
    )
    soundObject = sound
  } catch (err) {
    // Gracefully handle Expo Go environments where ExponentAV is not compiled in
  }
}
