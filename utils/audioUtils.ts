/**
 * Audio Utilities for robust playback across all devices,
 * with special protections for iOS Safari / iPad hardware sleep / audio clipping.
 */

// Shared AudioContext instance (created with device-native sampleRate, avoiding iOS session renegotiation)
let sharedAudioContext: AudioContext | null = null;
let keepAliveSource: AudioBufferSourceNode | null = null;
let keepAliveGain: GainNode | null = null;
let keepAliveUserCount = 0;

export function getSharedAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    // Do NOT force { sampleRate: 24000 } on AudioContext on iOS Safari,
    // as it triggers hardware sample-rate renegotiation and initial audio dropouts.
    sharedAudioContext = new AudioContextClass();
  }
  return sharedAudioContext;
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

/**
 * Decodes raw PCM 16-bit audio into an AudioBuffer with silence padding.
 * 
 * WHY LEAD-IN PADDING:
 * On iOS/iPadOS Safari, hardware audio amplifiers enter a low-power standby mode
 * after 1-2 seconds of silence. When playback starts, the amplifier takes 80-150ms
 * to ramp up and unmute. By prepending ~120ms of silence, the amplifier wakes up
 * during the silent frames, ensuring the first phoneme/syllable is never clipped!
 */
export async function decodeAudioData(
  data: Uint8Array, 
  ctx: AudioContext, 
  sampleRate: number = 24000, 
  numChannels: number = 1,
  leadInSilenceMs: number = 120,
  trailingSilenceMs: number = 50
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const rawFrameCount = Math.floor(dataInt16.length / numChannels);
  
  const leadInFrames = leadInSilenceMs > 0 ? Math.round((sampleRate * leadInSilenceMs) / 1000) : 0;
  const trailingFrames = trailingSilenceMs > 0 ? Math.round((sampleRate * trailingSilenceMs) / 1000) : 0;
  const totalFrames = rawFrameCount + leadInFrames + trailingFrames;
  
  const buffer = ctx.createBuffer(numChannels, totalFrames, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    // channelData is automatically zero-filled by Web Audio specification (zeros = silence)
    for (let i = 0; i < rawFrameCount; i++) {
      channelData[leadInFrames + i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Starts a silent keep-alive node to prevent iOS CoreAudio from sleeping the hardware amplifier.
 * Uses reference counting so multiple screens can request keep-alive safely.
 */
export function startAudioKeepAlive(ctx: AudioContext): () => void {
  keepAliveUserCount++;
  
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    if (!keepAliveSource) {
      // Create a 1-second silent buffer
      const silentBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = silentBuffer;
      source.loop = true;
      
      // Connect to a near-zero gain node (-100dB, inaudible, but prevents iOS power gating)
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.00001;
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
      
      keepAliveSource = source;
      keepAliveGain = gainNode;
    }
  } catch (err) {
    console.warn("Unable to start audio keep-alive:", err);
  }
  
  return () => {
    keepAliveUserCount = Math.max(0, keepAliveUserCount - 1);
    if (keepAliveUserCount === 0) {
      stopAudioKeepAlive();
    }
  };
}

export function stopAudioKeepAlive(): void {
  try {
    if (keepAliveSource) {
      keepAliveSource.stop();
      keepAliveSource.disconnect();
      keepAliveSource = null;
    }
    if (keepAliveGain) {
      keepAliveGain.disconnect();
      keepAliveGain = null;
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * Wakes up AudioContext immediately if suspended.
 */
export async function warmUpAudioContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
}

