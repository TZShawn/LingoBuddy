import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Mic, MicOff, Play, Pause, Volume2 } from 'lucide-react';
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
  user_message: string;
  ai_response: string;
  created_at: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  audioUrl?: string;
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

const HoverableText: React.FC<{ text: string; language: string }> = ({ text, language }) => {
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

const Conversation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const language = searchParams.get('language') || 'Spanish';
  const { toast } = useToast();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<'ready' | 'recording' | 'processing'>('ready');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const loadConversation = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        const savedUser = localStorage.getItem('lingobuddy_user');
        const userId = savedUser ? JSON.parse(savedUser).id : null;
        
        const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
          headers: { 'X-User-Id': userId }
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
            if (interaction.user_message) {
              messageList.push({
                id: `user-${interaction.id}`,
                type: 'user',
                content: interaction.user_message,
                timestamp: new Date(interaction.created_at)
              });
            }
            if (interaction.ai_response) {
              messageList.push({
                id: `ai-${interaction.id}`,
                type: 'ai',
                content: interaction.ai_response,
                timestamp: new Date(interaction.created_at),
                audioUrl: '/mock-audio.mp3' // Will be replaced with real audio
              });
            }
          });
        }
        
        // If no interactions, add welcome message
        if (messageList.length === 0) {
          messageList.push({
            id: 'welcome',
            type: 'ai',
            content: language === 'Spanish' ? '¡Hola! ¿Cómo estás hoy?' : 
                     language === 'French' ? 'Bonjour! Comment allez-vous aujourd\'hui?' :
                     'Hello! How are you today?',
            timestamp: new Date(),
            audioUrl: '/mock-audio.mp3'
          });
        }
        
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

  const handleStartRecording = async () => {
    try {
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus('recording');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Failed to start recording. Please check microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingStatus('processing');
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!conversation) return;

    try {
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const savedUser = localStorage.getItem('lingobuddy_user');
      const userId = savedUser ? JSON.parse(savedUser).id : null;

      // Transcribe audio
      const transcribeResponse = await fetch(`${API_BASE_URL}/speech/transcribe`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          audioFile: base64Audio,
          conversationId: conversation.id,
          language: conversation.language
        })
      });

      const transcribeData = await transcribeResponse.json();
      
      if (!transcribeData.success) {
        throw new Error(transcribeData.error);
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
      const generateResponse = await fetch(`${API_BASE_URL}/speech/generate-response`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          text: transcribeData.data.text,
          conversationId: conversation.id,
          language: conversation.language
        })
      });

      const generateData = await generateResponse.json();
      
      if (!generateData.success) {
        throw new Error(generateData.error);
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

    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Error",
        description: "Failed to process audio. Please try again.",
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
        toast({
          title: "Error",
          description: "Failed to play audio",
          variant: "destructive",
        });
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingAudio(null);
      toast({
        title: "Error",
        description: "Failed to play audio",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-accent-soft/5 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
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
                  {conversation?.language || language}
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

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
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
                      <HoverableText text={message.content} language={language} />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs opacity-70">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
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

      {/* Recording Interface */}
      <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm p-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <p className="text-sm font-medium">
                {recordingStatus === 'ready' && 'Hold to record your response'}
                {recordingStatus === 'recording' && 'Recording... Release to stop'}
                {recordingStatus === 'processing' && 'Processing your speech...'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Speak naturally in {conversation?.language || language}
              </p>
            </div>

            <Button
              size="lg"
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
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