/**
 * Float32 PCM → 16-bit WAV. The VAD hands us mono @ 16 kHz, which is exactly what Whisper wants,
 * so this is a header plus a clamp — no resampling anywhere in the path.
 */

const SAMPLE_RATE = 16_000;
const BITS_PER_SAMPLE = 16;
const HEADER_BYTES = 44;

export function encodeWav(
  samples: Float32Array,
  sampleRate = SAMPLE_RATE,
): Blob {
  const bytes = samples.length * 2;
  const buffer = new ArrayBuffer(HEADER_BYTES + bytes);
  const view = new DataView(buffer);

  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, (sampleRate * BITS_PER_SAMPLE) / 8, true); // byte rate
  view.setUint16(32, BITS_PER_SAMPLE / 8, true); // block align
  view.setUint16(34, BITS_PER_SAMPLE, true);
  ascii(36, "data");
  view.setUint32(40, bytes, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(HEADER_BYTES + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/** Seconds of audio in a VAD segment — used to throw away sub-word blips before paying for STT. */
export function durationSeconds(
  samples: Float32Array,
  sampleRate = SAMPLE_RATE,
): number {
  return samples.length / sampleRate;
}
