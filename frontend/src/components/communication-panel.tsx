"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/libs/supabase-browser";

import { usePresence } from "@/hooks/usePresence";
import { useAudioCall } from "@/hooks/useAudioCall";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { 
  Phone, 
  PhoneOff, 
  PhoneIncoming, 
  Send, 
  Paperclip, 
  Mic, 
  AlertTriangle,
  File,
  X,
  StopCircle,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: string;
  file_url: string | null;
  is_emergency: boolean;
  created_at: string;
};

type Contact = {
  id: string;
  name: string;
  role: "patient" | "provider" | "caregiver";
  patient_id?: string; // used for emergency routing if the contact is a provider/caregiver of this patient
};

export function CommunicationPanel({ 
  currentUserId, 
  currentUserRole,
  isActive = true,
}: { 
  currentUserId: string; 
  currentUserRole: "patient" | "provider" | "caregiver"; 
  isActive?: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  const { authFetch } = useAuthFetch();
  const onlineUsers = usePresence(currentUserId);
  const { 
    callState, 
    remoteUser, 
    remoteAudioRef, 
    startCall, 
    acceptCall, 
    rejectCall, 
    endCall 
  } = useAudioCall(currentUserId);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Contacts based on Role
  useEffect(() => {
    const fetchContacts = async () => {
      let fetched: Contact[] = [];
      
      if (currentUserRole === "patient") {
        const [{ data: cgl }, { data: pl }] = await Promise.all([
          supabase.from("caregiver_patient_links").select("caregiver_id").eq("patient_id", currentUserId).eq("status", "active"),
          supabase.from("provider_patient_links").select("provider_id").eq("patient_id", currentUserId).eq("status", "active")
        ]);
        
        const caregiverIds = (cgl || []).map((l: any) => l.caregiver_id);
        const providerIds = (pl || []).map((l: any) => l.provider_id);
        const userIdsToFetch = [...caregiverIds, ...providerIds];

        if (userIdsToFetch.length > 0) {
          const { data: users } = await supabase.from("users").select("id, display_name, full_name, email").in("id", userIdsToFetch);
          const usersMap = new Map((users || []).map((u: any) => [u.id, u]));

          fetched = [
            ...caregiverIds.map(id => ({ id, name: usersMap.get(id)?.full_name || usersMap.get(id)?.display_name || usersMap.get(id)?.email || "Unknown", role: "caregiver" as const, patient_id: currentUserId })),
            ...providerIds.map(id => ({ id, name: usersMap.get(id)?.full_name || usersMap.get(id)?.display_name || usersMap.get(id)?.email || "Unknown", role: "provider" as const, patient_id: currentUserId }))
          ];
        }
      } else if (currentUserRole === "caregiver") {
        const { data: cgl } = await supabase.from("caregiver_patient_links").select("patient_id").eq("caregiver_id", currentUserId).eq("status", "active");
        const patientIds = (cgl || []).map((l: any) => l.patient_id);
        
        if (patientIds.length > 0) {
          const { data: users } = await supabase.from("users").select("id, display_name, full_name, email").in("id", patientIds);
          const usersMap = new Map((users || []).map((u: any) => [u.id, u]));
          fetched = patientIds.map(id => ({ id, name: usersMap.get(id)?.full_name || usersMap.get(id)?.display_name || usersMap.get(id)?.email || "Unknown", role: "patient" as const, patient_id: id }));
        }
      } else {
        const { data: pl } = await supabase.from("provider_patient_links").select("patient_id").eq("provider_id", currentUserId).eq("status", "active");
        const patientIds = (pl || []).map((l: any) => l.patient_id);
        
        if (patientIds.length > 0) {
          const { data: users } = await supabase.from("users").select("id, display_name, full_name, email").in("id", patientIds);
          const usersMap = new Map((users || []).map((u: any) => [u.id, u]));
          fetched = patientIds.map(id => ({ id, name: usersMap.get(id)?.full_name || usersMap.get(id)?.display_name || usersMap.get(id)?.email || "Unknown", role: "patient" as const, patient_id: id }));
        }
      }
      setContacts(fetched);
    };
    fetchContacts();
  }, [currentUserId, currentUserRole, supabase]);

  // 2. Fetch Messages when a contact is selected
  useEffect(() => {
    if (!selectedContact) return;
    
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${currentUserId})`)
        .order("created_at", { ascending: true })
        .limit(100);
        
      if (data) setMessages(data as Message[]);
    };
    
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase.channel(`direct_messages:${currentUserId}:${selectedContact.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
        filter: `sender_id=eq.${selectedContact.id}`,
      }, (payload: any) => {
        // Double check receiver is us
        if (payload.new.receiver_id === currentUserId) {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId, selectedContact, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. Send Message
  const sendMessage = async (content: string, type: string = "text", file_url: string | null = null) => {
    if (!selectedContact) return;
    if (type === "text" && !content.trim()) return;

    // Send the physical message
    const { data } = await supabase.from("direct_messages").insert({
      sender_id: currentUserId,
      receiver_id: selectedContact.id,
      content,
      type,
      file_url,
      is_emergency: isEmergency
    } as any).select().single();

    if (data) {
      setMessages(prev => [...prev, data as Message]);
      setInputText("");
      
      if (isEmergency) {
        const patientId = selectedContact.patient_id || currentUserId;
        authFetch("/api/communications/emergency", {
          method: "POST",
          body: JSON.stringify({
            patientId: patientId,
            message: type === "text" ? content : `[${type.toUpperCase()} SENT]`,
            senderName: "User"
          }),
          headers: { "Content-Type": "application/json" }
        }).catch(err => console.error("Failed to send emergency alert", err));
      }
    }
  };

  const triggerImmediateSOS = async () => {
    if (!selectedContact) return;
    setIsEmergency(true);
    
    const patientId = selectedContact.patient_id || currentUserId;
    try {
      await authFetch("/api/communications/emergency", {
        method: "POST",
        body: JSON.stringify({
          patientId: patientId,
          message: "🚨 [IMMEDIATE SOS ALERT TRIGGERED]",
          senderName: "User"
        }),
        headers: { "Content-Type": "application/json" }
      });
      
      const { data } = await supabase.from("direct_messages").insert({
        sender_id: currentUserId,
        receiver_id: selectedContact.id,
        content: "🚨 I have triggered an Immediate SOS Alert.",
        type: "text",
        is_emergency: true
      } as any).select().single();
      
      if (data) {
        setMessages(prev => [...prev, data as Message]);
      }
    } catch (err) {
      console.error("Failed to send immediate emergency alert", err);
    }
  };

  // 4. File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContact) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be under 10MB");
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('chat_attachments')
      .upload(fileName, file);

    if (uploadError) {
      console.error(uploadError);
      alert("Failed to upload file");
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat_attachments')
      .getPublicUrl(fileName);

    const isImage = file.type.startsWith("image/");
    sendMessage(`Sent ${isImage ? "an image" : "a file"}: ${file.name}`, isImage ? "image" : "file", publicUrl);
  };

  // 5. Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const fileName = `voice-${currentUserId}-${Date.now()}.webm`;
        
        const { error } = await supabase.storage
          .from("chat_attachments")
          .upload(fileName, audioBlob);

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from("chat_attachments")
            .getPublicUrl(fileName);
          
          sendMessage("Voice message", "voice", publicUrl);
        }
        
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone access is required to send voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // Call handling display
  const renderCallOverlay = () => {
    if (callState === "idle") return null;

    let callerName = contacts.find(c => c.id === remoteUser)?.name || "Unknown User";

    return (
      <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white rounded-xl">
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border-4 border-slate-700 animate-pulse">
          {callState === "ringing" ? <PhoneIncoming size={32} className="text-blue-400" /> : <Phone size={32} className="text-green-400" />}
        </div>
        <h3 className="text-2xl font-bold mb-2">{callerName}</h3>
        <p className="text-slate-400 mb-8 capitalize">{callState}...</p>
        
        <div className="flex gap-4">
          {callState === "ringing" && (
            <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all shadow-lg shadow-green-500/20">
              <Phone size={24} />
            </button>
          )}
          
          <button onClick={() => callState === "ringing" ? rejectCall() : endCall()} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg shadow-red-500/20">
            <PhoneOff size={24} />
          </button>
        </div>
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    );
  };

  return (
    <div className={`flex h-[600px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden relative ${!isActive && callState === "idle" ? "hidden" : ""}`}>
      {renderCallOverlay()}
      
      {/* Main UI wrapper (hidden if inactive, but call overlay remains if active) */}
      <div className={`flex w-full h-full ${!isActive ? "hidden" : ""}`}>
        {/* Sidebar */}
      <div className={`w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex-col ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-semibold text-slate-800">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {contacts.map(contact => {
            const isOnline = onlineUsers.has(contact.id);
            return (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  selectedContact?.id === contact.id ? "bg-blue-50 border border-blue-100" : "hover:bg-slate-100"
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold uppercase">
                    {contact.name.substring(0, 2)}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-slate-400"}`}></div>
                </div>
                <div className="flex-1 truncate">
                  <div className="font-medium text-slate-900 truncate">{contact.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{contact.role}</div>
                </div>
              </button>
            )
          })}
          {contacts.length === 0 && (
            <div className="text-center p-4 text-slate-500 text-sm">No connections found.</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex-col bg-white ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold uppercase shrink-0">
                  {selectedContact.name.substring(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{selectedContact.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    {onlineUsers.has(selectedContact.id) ? (
                      <><span className="w-2 h-2 rounded-full bg-green-500 block"></span> Online</>
                    ) : (
                      <><span className="w-2 h-2 rounded-full bg-slate-400 block"></span> Offline</>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEmergency(!isEmergency)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isEmergency ? "bg-red-100 text-red-700 border border-red-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  title="Toggle Emergency Mode"
                >
                  <AlertTriangle size={16} className={isEmergency ? "animate-pulse" : ""} />
                  {isEmergency ? "Emergency Active" : "Emergency"}
                </button>
                <button 
                  onClick={triggerImmediateSOS}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20"
                  title="Send Immediate SOS Alert"
                >
                  <AlertTriangle size={16} />
                  Send SOS
                </button>
                
                <button 
                  onClick={() => startCall(selectedContact.id)}
                  disabled={!onlineUsers.has(selectedContact.id) || callState !== "idle"}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-600 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Audio Call"
                >
                  <Phone size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg, i) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                      isMe 
                        ? (msg.is_emergency ? "bg-red-600 text-white" : "bg-blue-600 text-white") 
                        : (msg.is_emergency ? "bg-red-50 text-red-900 border border-red-200" : "bg-white text-slate-800 border border-slate-200")
                    }`}>
                      {msg.is_emergency && !isMe && (
                        <div className="flex items-center gap-1 text-xs font-bold text-red-600 mb-1">
                          <AlertTriangle size={12} /> EMERGENCY
                        </div>
                      )}
                      
                      {msg.type === "text" && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                      
                      {msg.type === "image" && msg.file_url && (
                        <div className="mt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.file_url} alt="Attachment" className="max-w-full rounded-lg" />
                        </div>
                      )}
                      
                      {msg.type === "voice" && msg.file_url && (
                        <div className="mt-1">
                          <audio controls className={`h-8 w-full max-w-[200px] ${isMe ? "invert opacity-90" : ""}`}>
                            <source src={msg.file_url} type="audio/webm" />
                          </audio>
                        </div>
                      )}

                      {msg.type === "file" && msg.file_url && (
                        <a href={msg.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-1 underline decoration-white/50 underline-offset-2">
                          <File size={16} /> <span className="text-sm truncate max-w-[150px]">{msg.content}</span>
                        </a>
                      )}
                      
                      <div className={`text-[10px] mt-1 text-right ${isMe ? "text-blue-200" : "text-slate-400"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-200 bg-white">
              {isEmergency && (
                <div className="mb-2 px-3 py-2 bg-red-50 text-red-800 text-xs rounded-lg flex items-start gap-2 border border-red-100">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p><strong>Emergency Mode is ON.</strong> All messages you send will be marked as emergency and trigger immediate email alerts to the recipient.</p>
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf,text/plain"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <Paperclip size={20} />
                </button>
                
                <div className="flex-1 bg-slate-100 rounded-2xl flex items-center px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all border border-transparent focus-within:border-blue-200">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(inputText);
                      }
                    }}
                    placeholder={isRecording ? "Recording voice note..." : "Type a message..."}
                    className="w-full bg-transparent border-none outline-none resize-none max-h-32 text-sm text-slate-800 py-1.5 scrollbar-thin"
                    rows={1}
                    disabled={isRecording}
                  />
                </div>

                {inputText.trim() ? (
                  <button 
                    onClick={() => sendMessage(inputText)}
                    className="p-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-colors shadow-sm shadow-blue-600/20"
                  >
                    <Send size={18} className="ml-0.5" />
                  </button>
                ) : (
                  <button 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    className={`p-2.5 rounded-full transition-colors ${
                      isRecording 
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-lg font-medium text-slate-500">No contact selected</p>
            <p className="text-sm">Select a connection from the sidebar to start communicating.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
