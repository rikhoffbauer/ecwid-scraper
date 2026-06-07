import { useCallback, useEffect, useRef, useState } from "react";

export interface ScreenShareState {
  active: boolean;
  startedAt?: number;
  preview?: string;
  error?: string;
  voiceActive: boolean;
}

export function useScreenShare(apiUrl: string) {
  const [state, setState] = useState<ScreenShareState>({ active: false, voiceActive: false });
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<string | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const captureFrame = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || track.readyState !== "live" || document.hidden) return frameRef.current;
    const video = document.createElement("video");
    video.srcObject = new MediaStream([track]);
    video.muted = true;
    void video.play().then(() => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, 1));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      frameRef.current = canvas.toDataURL("image/jpeg", .62);
      setState((current) => ({ ...current, preview: frameRef.current }));
      video.srcObject = null;
    });
    return frameRef.current;
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current?.close();
    streamRef.current = null;
    peerRef.current = null;
    frameRef.current = undefined;
    setState({ active: false, voiceActive: false });
  }, []);

  const startVoice = useCallback(async () => {
    const tokenResponse = await fetch(`${apiUrl}/api/realtime/client-secret`, { method: "POST" });
    if (!tokenResponse.ok) throw new Error("Realtime voice is unavailable");
    const token = await tokenResponse.json() as { value?: string; client_secret?: { value?: string } };
    const secret = token.value ?? token.client_secret?.value;
    if (!secret) throw new Error("Realtime session returned no client secret");
    const peer = new RTCPeerConnection();
    peerRef.current = peer;
    const audio = document.createElement("audio");
    audio.autoplay = true;
    peer.ontrack = (event) => { audio.srcObject = event.streams[0] ?? null; };
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    peer.addTrack(mic.getAudioTracks()[0]!, mic);
    peer.createDataChannel("oai-events");
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const answer = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/sdp" }
    });
    await peer.setRemoteDescription({ type: "answer", sdp: await answer.text() });
    setState((current) => ({ ...current, voiceActive: true }));
  }, [apiUrl]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", stop, { once: true });
      setState({ active: true, startedAt: Date.now(), voiceActive: false });
      captureFrame();
      timerRef.current = window.setInterval(captureFrame, 2000);
      try {
        await startVoice();
      } catch {
        setState((current) => ({ ...current, voiceActive: false }));
      }
    } catch (error) {
      setState({ active: false, voiceActive: false, error: (error as Error).message });
    }
  }, [captureFrame, startVoice, stop]);

  useEffect(() => stop, [stop]);
  return { state, start, stop, captureFrame, currentFrame: () => frameRef.current };
}
