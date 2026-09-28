import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

export const useVoice = (sessionId: string = `session-${Math.random().toString(36).substring(2, 10)}`) => {
  const { setIsListening, setIsSpeaking } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isContinuousRef = useRef(false);
  const lastGeneratedIntentRef = useRef<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const requestAnimationFrameRef = useRef<number | null>(null);

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
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.minDecibels = -70; // Noise floor
      analyser.fftSize = 512; // Restore original fftSize
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let isSpeaking = false; // Tracks if they actually started talking
      let lastLogTime = 0;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const checkSilence = () => {
        if (mediaRecorder.state !== 'recording') return;

        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;

        const now = Date.now();
        if (now - lastLogTime > 500) {
           console.log(`VAD Average: ${average.toFixed(2)} | isSpeaking: ${isSpeaking}`);
           lastLogTime = now;
        }

        if (average > 15) { 
          // Noise detected (User is speaking)
          isSpeaking = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (isSpeaking && average <= 15) { 
          // Silence detected AFTER they started speaking
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              stopRecording();
            }, 1200); // Wait 1.2 seconds before auto-submitting
          }
        }
        
        requestAnimationFrameRef.current = requestAnimationFrame(checkSilence);
      };
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
        
        // Append graph state for the heuristic engine
        const storeState = useStore.getState();
        const graphState = JSON.stringify({
          nodeStatuses: storeState.nodeStatuses,
          nodes: storeState.graphDatabase?.nodes || {}
        });
        formData.append('graph_state', graphState);

        try {
          // Hit the ngrok REST endpoint
          const response = await fetch('https://factsheet-tradition-giblet.ngrok-free.dev/voice/journey', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Voice API failed');
          const data = await response.json();

          // Apply visual graph updates in sync with voice
          if (data.graph_updates && data.graph_updates.length > 0) {
            const newStatuses: Record<string, any> = {};
            data.graph_updates.forEach((update: any) => {
              newStatuses[update.node_id] = update.new_status;
            });
            useStore.getState().syncTaskState(newStatuses);
          }

          // Push the spoken conversation directly into the UI chat log
          if (data.transcript && data.voice_reply) {
            useStore.getState().addVoiceMessages(data.transcript, data.voice_reply);
          } else if (data.transcript && data.reply_text) {
            useStore.getState().addVoiceMessages(data.transcript, data.reply_text);
          }

          // Automatically trigger the graph generation if the chatbot extracted an intent
          if (data.task_state) {
            // Note: We deliberately removed syncTaskState(data.task_state) here because
            // data.task_state contains { intent, location, session_id } which corrupts 
            // the nodeStatuses (which should only contain 'completed' | 'locked' etc).
            
            const hasIntent = data.task_state.intent && data.task_state.intent !== 'unknown';
            const botThinksItsReady = data.voice_reply && (
              data.voice_reply.toLowerCase().includes('enough') || 
              data.voice_reply.toLowerCase().includes('generate') ||
              data.voice_reply.toLowerCase().includes('look up') ||
              data.voice_reply.toLowerCase().includes('procedure')
            );
            
            if (hasIntent || botThinksItsReady) {
              const currentIntent = hasIntent ? data.task_state.intent : 'fallback_intent';
              
              if (lastGeneratedIntentRef.current !== currentIntent) {
                  lastGeneratedIntentRef.current = currentIntent;
                  
                  const queryParts = [];
                  if (hasIntent) {
                      queryParts.push(data.task_state.intent);
                  } else {
                      queryParts.push(data.transcript); // Fallback to raw transcript
                  }

                  if (data.task_state.details) {
                      Object.values(data.task_state.details).forEach(v => queryParts.push(String(v)));
                  }
                  if (data.task_state.location?.city) queryParts.push(data.task_state.location.city);
                  if (data.task_state.location?.state) queryParts.push(data.task_state.location.state);
                  
                  const finalQuery = queryParts.join(' ').replace(/_/g, ' ');
                  console.log("Auto-triggering web scraping for:", finalQuery, " | State:", data.task_state);
                  
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
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      checkSilence(); // Start the loop AFTER the recorder starts
      setIsRecording(true);
      setIsListening(true); // Robot turns white, leans in to listen
      
    } catch (error) {
      console.error("Microphone access denied:", error);
    }
  };

  const stopRecording = () => {
    isContinuousRef.current = false;
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (requestAnimationFrameRef.current) {
      cancelAnimationFrame(requestAnimationFrameRef.current);
      requestAnimationFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // This triggers the onstop event above
      setIsRecording(false);
    }
  };

  return { startRecording, stopRecording, isRecording };
};
