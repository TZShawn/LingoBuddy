import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Mic, MicOff, Play, Pause, Volume2, Settings, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  user_id: string;
  language: string;
  title: string;
  created_at: string;
  updated_at: string;
  interactions?: Interaction[];
}

interface Interaction {
  id: string;
  conversation_id: string;
  message: string;
  sender: 'user' | 'ai';
  created_at: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  translated?: boolean;
  translationData?: Array<{
    text: string;
    translation: string;
    hoverable: boolean;
    partOfSpeech?: string;
  }>;
  fullTranslation?: string;
}

interface WordTranslation {
  word: string;
  translation: string;
  loading?: boolean;
}

// Mock translations
const mockTranslations: { [key: string]: string } = {
  'hola': 'hello',
  'como': 'how',
  'estas': 'are you',
  'bien': 'well/good',
  'gracias': 'thank you',
  'bonjour': 'hello',
  'comment': 'how',
  'allez': 'go',
  'vous': 'you',
  'merci': 'thank you'
};

const HoverableText: React.FC<{ 
  text: string; 
  language: string; 
  translationData?: Array<{
    text: string;
    translation: string;
    hoverable: boolean;
    partOfSpeech?: string;
  }>;
}> = ({ text, language, translationData }) => {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [translations, setTranslations] = useState<{ [key: string]: WordTranslation }>({});
  const { toast } = useToast();

  const handleWordHover = async (word: string) => {
    const cleanWord = word.replace(/[.,!?;]/g, '').toLowerCase();
    setHoveredWord(cleanWord);

    if (!translations[cleanWord] && cleanWord.length > 2) {
      setTranslations(prev => ({ ...prev, [cleanWord]: { word: cleanWord, translation: '', loading: true } }));
      
      try {
        const response = await fetch(`${API_BASE_URL}/translate/word`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: cleanWord,
            sourceLanguage: language,
            targetLanguage: 'English'
          })
        });
        
        const data = await response.json();
        
        setTranslations(prev => ({
          ...prev,
          [cleanWord]: { 
            word: cleanWord, 
            translation: data.success ? data.data.translatedWord : 'Translation unavailable', 
            loading: false 
          }
        }));
      } catch (error) {
        console.error('Translation error:', error);
        setTranslations(prev => ({
          ...prev,
          [cleanWord]: { 
            word: cleanWord, 
            translation: 'Translation unavailable', 
            loading: false 
          }
        }));
      }
    }
  };

  // If we have translation data, use it; otherwise fall back to the old method
  if (translationData && translationData.length > 0) {
    console.log('HoverableText with translation data:', translationData);
    
    // For languages with translation data, we need to match segments to text positions
    const isChineseOrJapanese = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]/.test(text);
    
    if (isChineseOrJapanese) {
      // For Chinese/Japanese, we need to match segments to the text by position
      // since segments might be multi-character words
      let currentIndex = 0;
      const elements: JSX.Element[] = [];
      
      for (let i = 0; i < translationData.length; i++) {
        const segment = translationData[i];
        const segmentText = segment.text;
        const segmentStart = text.indexOf(segmentText, currentIndex);
        
        if (segmentStart === -1) {
          // If we can't find the segment, add it as plain text
          elements.push(<span key={`segment-${i}`}>{segmentText}</span>);
          currentIndex += segmentText.length;
        } else {
          // Add any text before this segment
          if (segmentStart > currentIndex) {
            const beforeText = text.slice(currentIndex, segmentStart);
            elements.push(<span key={`before-${i}`}>{beforeText}</span>);
          }
          
          // Add the segment with translation if hoverable
          if (segment.hoverable) {
            elements.push(
              <Tooltip key={`segment-${i}`}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "cursor-pointer transition-colors duration-200 hover:bg-chat-hover hover:text-primary rounded-sm px-0.5",
                      hoveredWord === segmentText && "bg-chat-hover text-primary"
                    )}
                    onMouseEnter={() => setHoveredWord(segmentText)}
                    onMouseLeave={() => setHoveredWord(null)}
                  >
                    {segmentText}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <div>
                      <strong>{segment.text}</strong> → {segment.translation}
                      {segment.partOfSpeech && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {segment.partOfSpeech}
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          } else {
            elements.push(<span key={`segment-${i}`}>{segmentText}</span>);
          }
          
          currentIndex = segmentStart + segmentText.length;
        }
      }
      
      // Add any remaining text
      if (currentIndex < text.length) {
        const remainingText = text.slice(currentIndex);
        elements.push(<span key="remaining">{remainingText}</span>);
      }
      
      return <span>{elements}</span>;
    } else {
      // For languages with spaces, split by words
      const words = text.split(/(\s+)/).filter(word => word.trim() !== '');
      
      return (
        <span>
          {words.map((word, index) => {
            // Find the corresponding translation data
            const translation = translationData.find(t => 
              t.text === word || t.text === word.replace(/[.,!?;]/g, '')
            );

            if (!translation || !translation.hoverable) {
              return <span key={index}>{word}</span>;
            }

            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <span
                  className={cn(
                    "cursor-pointer transition-colors duration-200 hover:bg-chat-hover hover:text-primary rounded-sm px-0.5",
                    hoveredWord === word && "bg-chat-hover text-primary"
                  )}
                  onMouseEnter={() => setHoveredWord(word)}
                  onMouseLeave={() => setHoveredWord(null)}
                >
                  {word}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div>
                    <strong>{translation.text}</strong> → {translation.translation}
                    {translation.partOfSpeech && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {translation.partOfSpeech}
                      </div>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
    );
    }
  }

  // Fallback to old method for backward compatibility
  const words = text.split(/(\s+)/);
  
  return (
    <span>
      {words.map((word, index) => {
        const cleanWord = word.replace(/[.,!?;]/g, '').toLowerCase();
        const hasTranslation = mockTranslations[cleanWord];
        const translation = translations[cleanWord];

        if (word.trim() === '') return <span key={index}>{word}</span>;

        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "cursor-pointer transition-colors duration-200",
                  hasTranslation && "hover:bg-chat-hover hover:text-primary rounded-sm px-0.5",
                  hoveredWord === cleanWord && "bg-chat-hover text-primary"
                )}
                onMouseEnter={() => hasTranslation && handleWordHover(word)}
                onMouseLeave={() => setHoveredWord(null)}
              >
                {word}
              </span>
            </TooltipTrigger>
            {hasTranslation && (
              <TooltipContent>
                <div className="text-center">
                  {translation?.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                      <span>Loading...</span>
                    </div>
                  ) : translation ? (
                    <span><strong>{cleanWord}</strong> → {translation.translation}</span>
                  ) : (
                    <span>Loading translation...</span>
                  )}
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}
    </span>
  );
};

// Language code to name mapping
const codeToLanguage = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Mandarin (simplified)',
}

const Conversation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const language = searchParams.get('language') || 'English';
  const { toast } = useToast();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<'ready' | 'recording' | 'processing'>('ready');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [currentMic, setCurrentMic] = useState<string>('');
  const [translatingMessage, setTranslatingMessage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load available microphones
  useEffect(() => {
    const loadMicrophones = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        console.log('Available microphones:', audioInputs);
        setAvailableMics(audioInputs);
        
        // Set default microphone
        if (audioInputs.length > 0) {
          setSelectedMicId(audioInputs[0].deviceId);
          setCurrentMic(audioInputs[0].label || 'Default Microphone');
        }
      } catch (error) {
        console.error('Error loading microphones:', error);
        toast({
          title: "Error",
          description: "Failed to access microphone devices",
          variant: "destructive",
        });
      }
    };

    loadMicrophones();
  }, [toast]);

  useEffect(() => {
    const loadConversation = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        const savedUser = localStorage.getItem('lingobuddy_user');
        const userId = savedUser ? JSON.parse(savedUser).id : null;
        
        console.log(id)

        const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error);
        }
        
        const conversationData = data.data;
        setConversation(conversationData);
        
        // Convert interactions to messages
        const messageList: Message[] = [];
        if (conversationData.interactions) {
          conversationData.interactions.forEach((interaction: Interaction) => {
            messageList.push({
              id: interaction.id,
              type: interaction.sender,
              content: interaction.message,
              timestamp: new Date(interaction.created_at),
              audioUrl: interaction.sender === 'ai' ? '/mock-audio.mp3' : undefined // Will be replaced with real audio
            });
          });
        }
        
        // If no interactions, don't add any welcome message
        // The chat will be empty and clean
        
        setMessages(messageList);
      } catch (error) {
        console.error('Error loading conversation:', error);
        toast({
          title: "Error",
          description: "Failed to load conversation",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [id, language, navigate, toast]);

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setRecordingStatus('processing');
        setIsProcessing(true);
      }
    } else {
      // Start recording
      try {
        const audioConstraints: MediaTrackConstraints = {
          sampleRate: 16000, // Deepgram works better with 16kHz
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };

        // Use selected microphone if available
        if (selectedMicId) {
          audioConstraints.deviceId = { exact: selectedMicId };
        }

        console.log('Requesting microphone access with constraints:', audioConstraints);
        console.log('Selected microphone ID:', selectedMicId);

        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: audioConstraints
        });

        // Get the actual device being used
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const track = audioTracks[0];
          const settings = track.getSettings();
          console.log('Actual microphone settings:', settings);
          
          // Find the microphone name from our list
          const micInfo = availableMics.find(mic => mic.deviceId === settings.deviceId);
          const micName = micInfo?.label || `Microphone ${settings.deviceId?.slice(0, 8) || 'Unknown'}`;
          setCurrentMic(micName);
        }
        
        // Check for supported MIME types
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'audio/wav';
            }
          }
        }
        
        console.log('Using MIME type:', mimeType);
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: mimeType
        });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('Recording stopped, processing audio...');
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('Audio blob created:', {
            size: audioBlob.size,
            type: audioBlob.type,
            sizeInMB: (audioBlob.size / (1024 * 1024)).toFixed(2)
          });
          
          
          // Check if audio is long enough (at least 0.5 seconds)
          if (audioBlob.size < 1000) {
            console.warn('Audio too short, might not be transcribed');
            toast({
              title: "Warning",
              description: "Recording too short. Please speak for at least 1 second.",
              variant: "destructive",
            });
            setIsProcessing(false);
            setRecordingStatus('ready');
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          
          await processAudio(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          toast({
            title: "Error",
            description: "Recording failed. Please try again.",
            variant: "destructive",
          });
          setIsRecording(false);
          setRecordingStatus('ready');
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start(100); // Collect data every 100ms
        setIsRecording(true);
        setRecordingStatus('recording');
        console.log('Recording started with MIME type:', mimeType);
      } catch (error) {
        console.error('Error starting recording:', error);
        toast({
          title: "Error",
          description: "Failed to start recording. Please check microphone permissions.",
          variant: "destructive",
        });
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!conversation) return;

    try {
      // Debug audio blob info
      console.log('Audio blob info:', {
        size: audioBlob.size,
        type: audioBlob.type,
        sizeInMB: (audioBlob.size / (1024 * 1024)).toFixed(2)
      });

      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      console.log('Base64 audio length:', base64Audio.length);

      const savedUser = localStorage.getItem('lingobuddy_user');
      const userId = savedUser ? JSON.parse(savedUser).id : null;

      // Transcribe audio
      console.log('Sending transcription request...');
      const transcribeResponse = await fetch(`${API_BASE_URL}/speech/transcribe`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioFile: base64Audio,
          conversationId: conversation.id,
          language: conversation.language,
          userId: userId
        })
      });

      const transcribeData = await transcribeResponse.json();
      console.log('Transcription response:', transcribeData);
      
      if (!transcribeData.success) {
        throw new Error(transcribeData.error || 'Transcription failed');
      }

      if (!transcribeData.data?.text || transcribeData.data.text.trim() === '') {
        throw new Error('No speech detected. Please try speaking louder or closer to the microphone.');
      }

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: transcribeData.data.text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Generate AI response
      console.log('Generating AI response...');
      const generateResponse = await fetch(`${API_BASE_URL}/speech/generate-response`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcribeData.data.text,
          conversationId: conversation.id,
          language: conversation.language
        })
      });

      const generateData = await generateResponse.json();


      console.log('Generate response:', generateData);
      
      if (!generateData.success) {
        throw new Error(generateData.error || 'Failed to generate response');
      }

      // Add AI response
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: generateData.data.aiResponse,
        timestamp: new Date(),
        audioUrl: generateData.data.audioFile
      };
      setMessages(prev => [...prev, aiMessage]);

      // Auto-play the AI response audio
      if (generateData.data.audioFile) {
        setTimeout(() => {
          handlePlayAudio(aiMessage.id, generateData.data.audioFile);
        }, 500); // Small delay to ensure the message is rendered
      }

    } catch (error: any) {
      console.error('Error processing audio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setRecordingStatus('ready');
    }
  };

  const handlePlayAudio = async (messageId: string, audioUrl?: string) => {
    if (playingAudio === messageId) {
      setPlayingAudio(null);
      return;
    }

    if (!audioUrl) return;

    try {
      setPlayingAudio(messageId);
      
      // Convert base64 audio to blob and play
      const audioBlob = new Blob([Uint8Array.from(atob(audioUrl), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl_obj = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl_obj);
      
      audio.onended = () => {
        setPlayingAudio(null);
        URL.revokeObjectURL(audioUrl_obj);
      };
      
      audio.onerror = () => {
        setPlayingAudio(null);
        URL.revokeObjectURL(audioUrl_obj);
        console.warn('Failed to play audio for message:', messageId);
        // Don't show toast for auto-play failures to avoid spam
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingAudio(null);
      // Don't show toast for auto-play failures to avoid spam
    }
  };

  const handleTranslateMessage = async (messageId: string, text: string) => {
    if (!conversation) return;

    try {
      setTranslatingMessage(messageId);
      
      // Convert language name to code for the API
      const languageCodeMap: { [key: string]: string } = {
        'English': 'en',
        'Spanish': 'es', 
        'French': 'fr',
        'German': 'de',
        'Italian': 'it',
        'Portuguese': 'pt',
        'Russian': 'ru',
        'Japanese': 'ja',
        'Korean': 'ko',
        'Chinese': 'zh',
        'Mandarin (simplified)': 'zh'
      };
      
      const sourceLanguageCode = languageCodeMap[conversation.language] || conversation.language;
      
      const response = await fetch(`${API_BASE_URL}/translate/split-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          sourceLanguage: sourceLanguageCode,
          targetLanguage: 'en'
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Translation failed');
      }

      // Update the message with translation data
      console.log('Translation API response:', data);
      console.log('Translation segments:', data.data.segments);
      console.log('Full translation:', data.data.textTranslation);
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              translated: true, 
              translationData: data.data.segments,
              fullTranslation: data.data.textTranslation
            }
          : msg
      ));

      toast({
        title: "Translation Complete",
        description: "Hover over words to see translations",
      });
    } catch (error: any) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Error",
        description: error.message || "Failed to translate message",
        variant: "destructive",
      });
    } finally {
      setTranslatingMessage(null);
    }
  };


  return (
    <div className="h-screen bg-gradient-to-br from-background via-primary-soft/5 to-accent-soft/5 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Badge className="bg-gradient-primary text-primary-foreground">
                  {codeToLanguage[conversation?.language as keyof typeof codeToLanguage] || conversation?.language || language}
                </Badge>
                <h1 className="text-lg font-semibold">Conversation Practice</h1>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {messages.length} messages
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages - Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="container mx-auto max-w-3xl space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <Card className={cn(
                "max-w-[80%] shadow-soft border-0 p-4",
                message.type === 'user' 
                  ? 'bg-gradient-primary text-primary-foreground ml-12' 
                  : 'bg-card mr-12'
              )}>
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {message.type === 'user' ? (
                      message.content
                    ) : (
                      <HoverableText 
                        text={message.content} 
                        language={language} 
                        translationData={message.translationData}
                      />
                    )}
                  </div>
                  
                  {/* Full translation display */}
                  {message.type === 'ai' && message.translated && message.fullTranslation && (
                    <div className="mt-2 p-2 bg-muted/50 rounded-md border-l-2 border-primary/30">
                      <div className="text-xs text-muted-foreground mb-1">Full Translation:</div>
                      <div className="text-sm text-foreground">{message.fullTranslation}</div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs opacity-70">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    <div className="flex items-center gap-1">
                      {message.type === 'ai' && !message.translated && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTranslateMessage(message.id, message.content)}
                          disabled={translatingMessage === message.id}
                          className="h-6 px-2 gap-1 hover:bg-muted"
                        >
                          {translatingMessage === message.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                          ) : (
                            <Languages className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                      {message.type === 'ai' && message.audioUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayAudio(message.id, message.audioUrl)}
                          className="h-6 px-2 gap-1 hover:bg-muted"
                        >
                          {playingAudio === message.id ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          <Volume2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            ))
          )}
          
          {isProcessing && (
            <div className="flex justify-start">
              <Card className="max-w-[80%] bg-card border-0 shadow-soft mr-12 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>AI is thinking...</span>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Recording Interface - Fixed at Bottom */}
      <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm p-4 flex-shrink-0">
        <div className="container mx-auto max-w-3xl">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <p className="text-sm font-medium">
                {recordingStatus === 'ready' && 'Click to start recording'}
                {recordingStatus === 'recording' && 'Recording... Click to stop'}
                {recordingStatus === 'processing' && 'Processing your speech...'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Speak naturally in {conversation?.language || language}
              </p>
              
              {/* Microphone Selector */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedMicId} onValueChange={setSelectedMicId}>
                  <SelectTrigger className="w-64 h-8 text-xs">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMics.map((mic) => (
                      <SelectItem key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Current microphone info */}
              {currentMic && (
                <p className="text-xs text-blue-600 mt-1">
                  Using: {currentMic}
                </p>
              )}
            </div>

            <Button
              size="lg"
              onClick={handleToggleRecording}
              disabled={isProcessing}
              variant="gradient"
              className={cn(
                "w-20 h-20 rounded-full transition-all duration-300",
                isRecording 
                  ? "bg-recording-pulse shadow-glow pulse-record" 
                  : "hover:shadow-glow"
              )}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8 text-primary-foreground" />
              ) : (
                <Mic className="w-8 h-8 text-primary-foreground" />
              )}
            </Button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Conversation;