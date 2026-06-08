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
  const channelRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSignatureRef = useRef<string | undefined>(undefined);

  const captureFrame = useCallback((force = false) => {
    const track = streamRef.current?.getVideoTracks()[0];
    const video = videoRef.current;
    if (!track || track.readyState !== "live" || !video || !video.videoWidth || document.hidden) return frameRef.current;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    const scale = Math.min(1, 1280 / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const signatureCanvas = signatureCanvasRef.current ?? document.createElement("canvas");
    signatureCanvasRef.current = signatureCanvas;
    signatureCanvas.width = 32;
    signatureCanvas.height = 18;
    signatureCanvas.getContext("2d")?.drawImage(video, 0, 0, 32, 18);
    const signature = signatureCanvas.toDataURL("image/jpeg", .3);
    if (!force && signature === lastSignatureRef.current) return frameRef.current;
    lastSignatureRef.current = signature;

    frameRef.current = canvas.toDataURL("image/jpeg", .58);
    if (channelRef.current?.readyState === "open") {
      channelRef.current.send(JSON.stringify({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_image", image_url: frameRef.current, detail: "low" }] }
      }));
    }
    setState((current) => ({ ...current, preview: frameRef.current }));
    return frameRef.current;
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    micRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current?.close();
    streamRef.current = null;
    peerRef.current = null;
    channelRef.current = null;
    micRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    videoRef.current = null;
    canvasRef.current = null;
    signatureCanvasRef.current = null;
    lastSignatureRef.current = undefined;
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
    micRef.current = mic;
    peer.addTrack(mic.getAudioTracks()[0]!, mic);
    channelRef.current = peer.createDataChannel("oai-events");
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
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      videoRef.current = video;
      await video.play();
      setState({ active: true, startedAt: Date.now(), voiceActive: false });
      captureFrame(true);
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
