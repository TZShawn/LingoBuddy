import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, Plus, Languages, Clock, Trash2, LogOut, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  user_id: string;
  language: string;
  title: string;
  created_at: string;
  updated_at: string;
  interactions?: any[];
}

interface Language {
  code: string;
  name: string;
  // native_name: string;
}

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

const nativeNameToCode = {
  'English': 'en',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Italian': 'it',
  'Portuguese': 'pt',
  'Russian': 'ru',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Mandarin (simplified)': 'zh',
}

const languageToVoiceId = {
  'en': {voiceId: 'cgSgspJ2msm6clMCkdW9', gender: 'female', name: 'Alice'},
  'es': {voiceId: 'iyvXhCAqzDxKnq3FDjZl', gender: 'female', name: 'Alice'},
  'fr': {voiceId: 'gaiKXUXMtA8O5fyBjiS9', gender: 'male', name: 'James'},
  'it': {voiceId: 'b8jhBTcGAq4kQGWmKprT', gender: 'female', name: 'Alice'},
  'ja': {voiceId: 'PmgfHCGeS5b7sH90BOOJ', gender: 'femmale', name: 'Alice'},
  'ko': {voiceId: 'AW5wrnG1jVizOYY7R1Oo', gender: 'female', name: 'Alice'},
  'zh': {voiceId: '4VZIsMPtgggwNg7OXbPY', gender: 'male', name: 'James'},
}


const Dashboard = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [chatTitle, setChatTitle] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [languages, setLanguages] = useState<Language[]>([
    {
      code: 'en',
      name: 'English',
      // native_name: 'English'
    },
    {
      code: 'es',
      name: 'Spanish',
      // native_name: 'Español'
    },
    {
      code: 'fr',
      name: 'French',
      // native_name: 'Français'
    },
    {
      code: 'it',
      name: 'Italian',
      // native_name: 'Italiano'
    },
    {
      code: 'ja',
      name: 'Japanese',
      // native_name: '日本語'
    },
    {
      code: 'ko',
      name: 'Korean',
      // native_name: '한국어'
    },
    {
      code: 'zh',
      name: 'Mandarin (simplified)',
      // native_name: '中文'
    }
  ]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get user ID from localStorage
        const savedUser = localStorage.getItem('lingobuddy_user');
        const userId = savedUser ? JSON.parse(savedUser).id : null;
        console.log(userId)
        if (!userId) return;


        const conversations = await fetch(`${API_BASE_URL}/allconversations/${userId}`).then(res => res.json());

        console.log(conversations)

        const conversationsData = await conversations;
        // const languagesData = await languagesRes.json();

        if (conversationsData.success) setConversations(conversationsData.data);
        // if (languagesData.success) setLanguages(languagesData.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleStartNewChat = async () => {
    if (!selectedLanguage) return;
    
    try {
      const savedUser = localStorage.getItem('lingobuddy_user');
      const userId = savedUser ? JSON.parse(savedUser).id : null;
      
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: nativeNameToCode[selectedLanguage],
          title: chatTitle.trim() || `${selectedLanguage} Practice`,
          userId: userId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        navigate(`/conversation/${data.data.id}`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const savedUser = localStorage.getItem('lingobuddy_user');
      const userId = savedUser ? JSON.parse(savedUser).id : null;
      
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        toast({
          title: "Success",
          description: "Conversation deleted successfully",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-accent-soft/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-full">
                <Languages className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">LingoBuddy</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.username}!</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                {user?.username}
              </div>
              <Button variant="outline" size="sm" onClick={logout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* New Conversation Card */}
          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Start New Conversation
              </CardTitle>
              <CardDescription>
                Choose a language and begin practicing with AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a language to practice" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((language) => (
                          <SelectItem key={language.code} value={language.name}>
                            {language.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Enter a custom title (optional)"
                      value={chatTitle}
                      onChange={(e) => setChatTitle(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleStartNewChat}
                    disabled={!selectedLanguage}
                    variant="gradient"
                    className="gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Start Chatting
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Conversations</h2>
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                {conversations.length} total
              </Badge>
            </div>

            {loading ? (
              <Card className="shadow-soft border-0 bg-gradient-card">
                <CardContent className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-muted-foreground">Loading conversations...</p>
                </CardContent>
              </Card>
            ) : conversations.length === 0 ? (
              <Card className="shadow-soft border-0 bg-gradient-card">
                <CardContent className="py-12 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No conversations yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start your first conversation to begin learning!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {conversations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((conversation) => (
                  <Card 
                    key={conversation.id}
                    className="shadow-soft border-0 bg-gradient-card hover:shadow-medium transition-all duration-300 cursor-pointer group"
                    onClick={() => navigate(`/conversation/${conversation.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-gradient-primary text-primary-foreground">
                              {codeToLanguage[conversation.language as keyof typeof codeToLanguage] || conversation.language}
                            </Badge>
                            <p className="text-sm text-muted-foreground font-medium">
                              {conversation.title || `${codeToLanguage[conversation.language as keyof typeof codeToLanguage] || conversation.language} Practice`}
                            </p>
                            <span className="text-sm text-muted-foreground">
                              {formatTimeAgo(conversation.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => handleDeleteConversation(conversation.id, e)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;