const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

async function getElevenLabsConfig(): Promise<{ key: string; voiceId: string; modelId: string }> {
  const res = await fetch('/api/eleven-config');
  const { key, voiceId, modelId } = await res.json();
  if (!key) throw new Error('No ElevenLabs API key configured');

  return {
    key,
    voiceId: voiceId || DEFAULT_VOICE_ID,
    modelId: modelId || DEFAULT_MODEL_ID,
  };
}

export async function generateTTSAudioUrl(text: string): Promise<string | null> {
  const w = window as Window & { ttsAudioCache?: Record<string, string> };
  if (!w.ttsAudioCache) w.ttsAudioCache = {};

  try {
    const { key, voiceId, modelId } = await getElevenLabsConfig();
    const cacheKey = `${voiceId}:${modelId}:${text}`;
    if (w.ttsAudioCache[cacheKey]) return w.ttsAudioCache[cacheKey];

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': key,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      if (errText.includes('paid_plan_required') || errText.includes('payment_required')) {
        console.error(
          'ElevenLabs: this voice requires a paid plan for API use. ' +
          'The website preview is free, but the API is not. ' +
          'Use a premade voice (category=premade) or upgrade your subscription.'
        );
      } else {
        console.error('ElevenLabs TTS error:', errText);
      }

      const proxyRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      });
      if (!proxyRes.ok) {
        console.error('TTS failed:', await proxyRes.text());
        return null;
      }
      const blob = await proxyRes.blob();
      const url = URL.createObjectURL(blob);
      w.ttsAudioCache[cacheKey] = url;
      return url;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    w.ttsAudioCache[cacheKey] = url;
    return url;
  } catch (err) {
    console.error('TTS failed:', err);
    return null;
  }
}

export async function playTTS(
  text: string,
  audioEl?: HTMLAudioElement,
  onEnded?: () => void
): Promise<boolean> {
  const url = await generateTTSAudioUrl(text);
  if (url) {
    const audio = audioEl || document.getElementById('global-voice-audio') as HTMLAudioElement || new Audio();
    audio.src = url;
    audio.onended = () => onEnded?.();
    audio.onerror = () => onEnded?.();
    await audio.play();
    return true;
  }

  if ('speechSynthesis' in window) {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.onend = () => {
        onEnded?.();
        resolve(true);
      };
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.speak(utterance);
    });
  }

  return false;
}

export function clearTTSCache() {
  const w = window as Window & { ttsAudioCache?: Record<string, string> };
  if (!w.ttsAudioCache) return;
  for (const url of Object.values(w.ttsAudioCache)) {
    URL.revokeObjectURL(url);
  }
  w.ttsAudioCache = {};
}
