import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/libs/supabase-browser";
import { RealtimeChannel } from "@supabase/supabase-js";

export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended";

export function useAudioCall(userId: string | undefined) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [remoteUser, setRemoteUser] = useState<string | null>(null);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabaseBrowserClient();
    // Unique channel for this user to receive signals
    const channel = supabase.channel(`call_signaling:${userId}`);

    channel
      .on("broadcast", { event: "call_offer" }, async ({ payload }: any) => {
        if (callState !== "idle") {
          // Busy
          await supabase.channel(`call_signaling:${payload.callerId}`).send({
            type: "broadcast",
            event: "call_rejected",
            payload: { reason: "busy" }
          });
          return;
        }
        
        setRemoteUser(payload.callerId);
        setCallState("ringing");
        // Store offer to answer later
        sessionStorage.setItem("pendingOffer", JSON.stringify(payload.offer));
      })
      .on("broadcast", { event: "call_answer" }, async ({ payload }: any) => {
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(payload.answer);
          setCallState("connected");
        }
      })
      .on("broadcast", { event: "ice_candidate" }, async ({ payload }: any) => {
        if (peerConnection.current && payload.candidate) {
          await peerConnection.current.addIceCandidate(payload.candidate);
        }
      })
      .on("broadcast", { event: "call_ended" }, () => {
        endCall(false);
      })
      .on("broadcast", { event: "call_rejected" }, () => {
        endCall(false);
        alert("Call was rejected or user is busy.");
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, callState]);

  const setupPeerConnection = async (targetId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        getSupabaseBrowserClient().channel(`call_signaling:${targetId}`).send({
          type: "broadcast",
          event: "ice_candidate",
          payload: { candidate: event.candidate, senderId: userId }
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch (err) {
      console.error("Failed to get local audio", err);
      alert("Microphone access is required for calling.");
      throw err;
    }

    peerConnection.current = pc;
    return pc;
  };

  const startCall = async (targetUserId: string) => {
    if (!userId) return;
    setRemoteUser(targetUserId);
    setCallState("calling");
    
    try {
      const pc = await setupPeerConnection(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      getSupabaseBrowserClient().channel(`call_signaling:${targetUserId}`).send({
        type: "broadcast",
        event: "call_offer",
        payload: { offer, callerId: userId }
      });
    } catch (e) {
      endCall(false);
    }
  };

  const acceptCall = async () => {
    if (!userId || !remoteUser) return;
    
    const pendingOfferStr = sessionStorage.getItem("pendingOffer");
    if (!pendingOfferStr) return;
    
    const offer = JSON.parse(pendingOfferStr);
    sessionStorage.removeItem("pendingOffer");

    try {
      const pc = await setupPeerConnection(remoteUser);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      getSupabaseBrowserClient().channel(`call_signaling:${remoteUser}`).send({
        type: "broadcast",
        event: "call_answer",
        payload: { answer, responderId: userId }
      });

      setCallState("connected");
    } catch (e) {
      endCall(false);
    }
  };

  const rejectCall = () => {
    if (remoteUser && userId) {
      getSupabaseBrowserClient().channel(`call_signaling:${remoteUser}`).send({
        type: "broadcast",
        event: "call_rejected",
        payload: { reason: "declined" }
      });
    }
    endCall(false);
  };

  const endCall = (notifyRemote: boolean = true) => {
    if (notifyRemote && remoteUser && userId) {
      getSupabaseBrowserClient().channel(`call_signaling:${remoteUser}`).send({
        type: "broadcast",
        event: "call_ended",
        payload: { senderId: userId }
      });
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    
    setCallState("idle");
    setRemoteUser(null);
    sessionStorage.removeItem("pendingOffer");
  };

  return {
    callState,
    remoteUser,
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall
  };
}
