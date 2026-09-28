import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

export const useVoice = (sessionId: string = `session-${Math.random().toString(36).substring(2, 10)}`) => {
  const { setIsListening, setIsSpeaking } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isContinuousRef = useRef(false);
  const lastGeneratedIntentRef = useRef<string | null>(null);

  const startRecording = async () => {
    isContinuousRef.current = true;
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Silence Detection via Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 512;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let silenceStart = Date.now();
      let isSpeaking = false;
      const SILENCE_THRESHOLD = 10; // Volume threshold
      const SILENCE_DURATION = 2000; // 2 seconds of silence
      const MAX_WAIT_TIME = 7000; // 7 seconds timeout if no speech

      const checkSilence = () => {
        if (mediaRecorder.state !== 'recording') {
            audioContext.close();
            return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        if (average > SILENCE_THRESHOLD) {
          isSpeaking = true;
          silenceStart = Date.now();
        } else {
          const now = Date.now();
          if (isSpeaking && now - silenceStart > SILENCE_DURATION) {
            mediaRecorder.stop();
            audioContext.close();
            return;
          } else if (!isSpeaking && now - silenceStart > MAX_WAIT_TIME) {
            mediaRecorder.stop();
            audioContext.close();
            return;
          }
        }
        
        requestAnimationFrame(checkSilence);
      };
      
      checkSilence();
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
            
            if (data.task_state.intent && data.task_state.intent !== 'unknown') {
              const hasLocation = data.task_state.location?.city || data.task_state.location?.state;
              
              if (hasLocation && lastGeneratedIntentRef.current !== data.task_state.intent) {
                  lastGeneratedIntentRef.current = data.task_state.intent;
                  
                  const queryParts = [data.task_state.intent];
                  if (data.task_state.details) {
                      Object.values(data.task_state.details).forEach(v => queryParts.push(String(v)));
                  }
                  if (data.task_state.location?.city) queryParts.push(data.task_state.location.city);
                  if (data.task_state.location?.state) queryParts.push(data.task_state.location.state);
                  
                  const finalQuery = queryParts.join(' ');
                  console.log("Auto-triggering web scraping for:", finalQuery);
                  
                  // Modify the reply text so it sounds more natural
                  data.reply_text = `I have enough information! Let me look up the procedure for ${data.task_state.intent.replace(/_/g, ' ')}...`;
                  
                  setTimeout(() => {
                      useStore.getState().fetchGraphData(finalQuery);
                  }, 1500);
              }
            }
          }

          // Play the synthesized audio returned from Python
          if (data.reply_audio_b64) {
            const audioUrl = `data:${data.audio_mime_type || 'audio/mpeg'};base64,${data.reply_audio_b64}`;
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
              setIsSpeaking(false); // Stop robot nodding when audio finishes
              if (isContinuousRef.current) {
                startRecording();
              }
            };
            
            await audio.play();
          } else {
            setIsSpeaking(false);
            if (isContinuousRef.current) {
              startRecording();
            }
          }
        } catch (error) {
          console.error("Voice API error:", error);
          setIsSpeaking(false);
          // If error occurs, we probably shouldn't auto-restart to prevent endless error loops
        }

        // Release the microphone
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
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
    isContinuousRef.current = false;
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This triggers the onstop event above
      setIsRecording(false);
    }
  };

  return { startRecording, stopRecording, isRecording };
};
