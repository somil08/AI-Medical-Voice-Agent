// ✅ Client Component (MedicalVoiceAgent.tsx)
"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { Circle, PhoneCall, PhoneOff, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import Vapi from "@vapi-ai/web";
import { doctorAgent } from "../../_components/DoctorCard";
import { toast } from "sonner";

 

 export type SessionDetails = {
  id: number;
  notes: string;
  sessionId: string;
  report: JSON;
  selectedDoctor: doctorAgent;
  createdon: string;
};

type message = {
  role: string;
  text: string;
};

function MedicalVoiceAgent() {
  const router = useRouter();
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails>();
  const [callStarted, setCallStarted] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [liveTranscripts, setLiveTranscripts] = useState<string>();
  const [messages, setMessages] = useState<message[]>([]);


  useEffect(() => {
    if (sessionId) GetSessionDetails();
  }, [sessionId]);

  const GetSessionDetails = async () => {
    try {
      const result = await axios.get("/api/session-chat?sessionId=" + sessionId);
      setSessionDetails(result.data);
    } catch (error) {
      console.error("Error fetching session details:", error);
    }
  };

  const startCall = async () => {
    if (!sessionDetails?.selectedDoctor) return;

    setLoading(true);
    const doctor = sessionDetails.selectedDoctor;

    try {
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY!);

      vapi.on("call-start", () => {
        console.log("✅ Call started");
        setCallStarted(true);
        setLoading(false);
      });

      vapi.on("call-end", () => {
        console.log("📞 Call ended");
        setCallStarted(false);
      });

      vapi.on("message", (message) => {
        if (message?.type === "transcript") {
          const { role, transcriptType, transcript } = message;
          if (transcriptType === "partial") {
            setLiveTranscripts(transcript);
            setCurrentRole(role);
          } else if (transcriptType === "final") {
            setMessages((prev) => [...prev, { role, text: transcript }]);
            setLiveTranscripts("");
            setCurrentRole(null);
          }
        }
      });

      vapi.on("speech-start", () => setCurrentRole("assistant"));
      vapi.on("speech-end", () => setCurrentRole("user"));

      await vapi.start({
        name: "AI Medical Doctor Agent",
        firstMessage: "Hello! I’m your AI medical assistant. How can I help you today?",
        transcriber: {
          provider: "deepgram",
          language: "en-US",
        },
        voice: {
          provider: "playht",
          voiceId: doctor.voiceId || "will",
        },
        model: {
          provider: "openai",
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                doctor.agentPrompt ||
                "You are a helpful medical assistant. Please assist the user with their medical queries.",
            },
          ],
        },
      });

      setVapiInstance(vapi);
    } catch (err) {
      console.error("Error starting Vapi agent:", err);
      setLoading(false);
    }
  };

  const endCall = async () => {
    setLoading(true);
  
    if (vapiInstance) {
      try {
        vapiInstance.stop();
        vapiInstance.removeAllListeners();
        setCallStarted(false);
        setVapiInstance(null);
  
        const report = await GenerateReport();
        console.log("✅ Report saved:", report);
      } catch (error) {
        console.error("Error ending call:", error);
      }
    }
  
    setLoading(false);
    toast.success("Call ended and report generated successfully!");
    router.replace("/dashboard");
  };

  const GenerateReport = async () => {
    try {
      const result = await axios.post("/api/medical-report", {
        messages,
        sessionDetails,
        sessionId,
      });
      return result.data;
    } catch (err) {
      console.error("Report generation failed:", err);
    }
  };

  return (
    <div className="p-6 border rounded-3xl bg-secondary/20 shadow-lg w-full max-w-md mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="px-3 py-1 border rounded-full flex gap-2 items-center text-sm font-medium">
          <Circle className={`h-4 w-4 rounded-full ${callStarted ? "bg-green-400" : "bg-red-400"}`} />
          {callStarted ? "Call Connected" : "Call Not Started"}
        </h2>
        <h2 className="font-semibold text-gray-500 text-sm">00:00</h2>
      </div>

      {sessionDetails && (
        <div className="flex items-center flex-col mt-8">
          <Image
            src={sessionDetails.selectedDoctor?.image ?? "/fallback.png"}
            alt="doctor image"
            width={100}
            height={100}
            className="h-[100px] w-[100px] object-cover rounded-full shadow-md"
          />
          <h2 className="mt-3 text-lg font-semibold text-gray-800">
            {sessionDetails.selectedDoctor?.specialist}
          </h2>
          <p className="text-sm text-gray-500">AI Medical Voice Agent</p>

          <div className="mt-10 text-center space-y-1 overflow-y-auto flex flex-col items-center px-6 max-h-48">
            {messages.slice(-4).map((msg, idx) => (
              <h2 className="text-sm text-gray-400" key={idx}>
                {msg.role}: {msg.text}
              </h2>
            ))}
            {liveTranscripts && (
              <h2 className="text-base font-medium text-gray-700">
                {currentRole}: {liveTranscripts}
              </h2>
            )}
          </div>

          <Button
            onClick={callStarted ? endCall : startCall}
            variant={callStarted ? "destructive" : "default"}
            className="mt-12 px-6 py-2 text-base rounded-xl shadow-md flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <Loader className="animate-spin h-4 w-4" />
            ) : callStarted ? (
              <>
                <PhoneOff className="h-4 w-4" /> End Call
              </>
            ) : (
              <>
                <PhoneCall className="h-4 w-4" /> Start Call
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default MedicalVoiceAgent;
