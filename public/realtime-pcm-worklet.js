// Streams mic audio from the input graph in fixed 100ms Float32 frames
// at the AudioContext's native sample rate. Main thread resamples to 24kHz
// PCM16 and ships each frame straight to the OpenAI realtime data channel,
// so audio reaches the model while the user is still holding push-to-talk.

class RealtimePCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameSize = Math.max(128, Math.round(sampleRate * 0.1));
    this.buffer = new Float32Array(this.frameSize);
    this.bufferIdx = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || !channel.length) return true;
    let ci = 0;
    while (ci < channel.length) {
      const take = Math.min(this.frameSize - this.bufferIdx, channel.length - ci);
      this.buffer.set(channel.subarray(ci, ci + take), this.bufferIdx);
      this.bufferIdx += take;
      ci += take;
      if (this.bufferIdx >= this.frameSize) {
        const frame = this.buffer;
        this.port.postMessage(frame, [frame.buffer]);
        this.buffer = new Float32Array(this.frameSize);
        this.bufferIdx = 0;
      }
    }
    return true;
  }
}

registerProcessor('realtime-pcm-processor', RealtimePCMProcessor);
