function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export async function playAudio(base64Audio: string, audioContext: AudioContext) {
  return new Promise<void>(async (resolve, reject) => {
    try {
        const decodedBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => resolve();
        source.start();
    } catch (error) {
        console.error("Failed to play audio:", error);
        reject(error);
    }
  });
}

export const fileToBase64 = (file: File): Promise<{base64: string, mimeType: string}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
            const base64 = result.split(',')[1];
            resolve({ base64, mimeType });
        };
        reader.onerror = (error) => reject(error);
    });
};

export const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const captureScreenAsBase64 = async (): Promise<{base64: string; mimeType: string;}> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Fix: The 'cursor' property is valid for getDisplayMedia but is not in the default
            // MediaTrackConstraints type. Casting to 'any' resolves the TypeScript error.
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" } as any,
                audio: false,
            });

            const track = stream.getVideoTracks()[0];
            
            // Use a temporary video element to get the correct dimensions
            const video = document.createElement('video');
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext('2d');
                context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                
                const dataUrl = canvas.toDataURL('image/jpeg');
                const mimeType = 'image/jpeg';
                const base64 = dataUrl.split(',')[1];

                // Stop sharing the screen
                track.stop();
                
                resolve({ base64, mimeType });
            };
        } catch (error) {
            console.error("Screen capture error:", error);
            reject(error);
        }
    });
};