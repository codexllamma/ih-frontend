import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';

export const useVoice = (sessionId: string = 'default-session-id') => {
  const { setIsListening, setIsSpeaking } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false); // Stop "listening" animation
        setIsSpeaking(true);   // Start "processing/speaking" animation (Robot turns yellow, nods)

        // Package the audio file for FastAPI
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        
        // These match your FastAPI File(...) and Form(...) requirements
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('session_id', sessionId);

        try {
          // Hit the ngrok REST endpoint
          const response = await fetch('https://factsheet-tradition-giblet.ngrok-free.dev/voice/respond', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Voice API failed');
          const data = await response.json();

          // Push the spoken conversation directly into the UI chat log
          if (data.transcript && data.reply_text) {
            useStore.getState().addVoiceMessages(data.transcript, data.reply_text);
          }

          // Automatically sync the graph state if the chatbot progressed the task
          if (data.task_state) {
            useStore.getState().syncTaskState(data.task_state);
          }

          // Play the synthesized audio returned from Python
          if (data.reply_audio_b64) {
            const audioUrl = `data:${data.audio_mime_type || 'audio/mpeg'};base64,${data.reply_audio_b64}`;
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
              setIsSpeaking(false); // Stop robot nodding when audio finishes
            };
            
            await audio.play();
          } else {
            setIsSpeaking(false);
          }
        } catch (error) {
          console.error("Voice API error:", error);
          setIsSpeaking(false);
        }

        // Release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setIsListening(true); // Robot turns white, leans in to listen
      
    } catch (error) {
      console.error("Microphone access denied:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This triggers the onstop event above
      setIsRecording(false);
    }
  };

  return { startRecording, stopRecording, isRecording };
};
