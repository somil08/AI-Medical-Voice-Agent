"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { Circle, PhoneCall, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import Vapi from "@vapi-ai/web";
import { doctorAgent } from "../../_components/DoctorCard";

type SessionDetails = {
  id: number;
  notes: string;
  sessionId: string;
  report: JSON;
  selectedDoctor: doctorAgent;
  createdOn: string;
};

type message = {
  role: string;
  text: string;
};

function MedicalVoiceAgent() {
  const { sessionId } = useParams();
  const [sessionDetails, setSessionDetails] = useState<SessionDetails>();
  const [callStarted, setCallStarted] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<any>();
  const [currentRole, setCurrentRole] = useState<string | null>();
  const [liveTranscripts, setLiveTranscripts] = useState<string>();
  const [messages, setMessages] = useState<message[]>([]);

  useEffect(() => {
    if (sessionId) {
      GetSessionDetails();
    }
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
    const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY!);
    const doctor = sessionDetails?.selectedDoctor;

    try {
      await vapi.start({
        name: "AI Medical Agent",
        firstMessage: "Hello! I’m your AI medical assistant. How can I help you today?",
        transcriber: {
          provider: "deepgram",
          language: "en-US",
        },
        voice: {
          provider: "playht",
          voiceId: doctor?.voiceId || "s3://voice-cloning-zero-shot/ai-doctor",
        },
        model: {
          provider: "openai",
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                doctor?.agentPrompt ||
                "You are a helpful medical assistant. Please assist the user with their medical queries.",
            },
          ],
        },
      });

      vapi.on("call-start", () => {
        console.log("Call started");
        setCallStarted(true);
      });

      vapi.on("call-end", () => {
        console.log("Call ended");
        setCallStarted(false);
      });

      vapi.on("message", (message) => {
        if (message.type === "transcript") {
          const { role, transcriptType, transcript } = message;
          console.log(`${role}: ${transcript}`);

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

      vapi.on("speech-start", () => {
        setCurrentRole("assistant");
      });

      vapi.on("speech-end", () => {
        setCurrentRole("user");
      });

      setVapiInstance(vapi);
    } catch (err) {
      console.error("Error starting Vapi agent:", err);
    }
  };

  const endCall = () => {
    if (!vapiInstance) return;

    vapiInstance.stop();
    vapiInstance.off("call-start");
    vapiInstance.off("call-end");
    vapiInstance.off("message");

    setCallStarted(false);
    setVapiInstance(null);
  };

  return (
    <div className="p-6 border rounded-3xl bg-secondary/20 shadow-lg w-full max-w-md mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="px-3 py-1 border rounded-full flex gap-2 items-center text-sm font-medium">
          <Circle
            className={`h-4 w-4 rounded-full ${callStarted ? "bg-green-400" : "bg-red-400"}`}
          />
          {callStarted ? "Call is Connected" : "Call Not Started"}
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

          {!callStarted ? (
            <Button onClick={startCall} className="mt-12 px-6 py-2 text-base rounded-xl shadow-md">
              <PhoneCall className="mr-2 h-4 w-4" /> Start Call
            </Button>
          ) : (
            <Button
              onClick={endCall}
              variant={"destructive"}
              className="mt-12 px-6 py-2 text-base rounded-xl shadow-md"
            >
              <PhoneOff className="mr-2 h-4 w-4" /> End Call
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default MedicalVoiceAgent;
