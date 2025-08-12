import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/chat/ChatMessagesView";
import { TaxFormView } from "@/components/tax-forms/TaxFormView";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Menu, FileText, MessageSquare, Calculator } from 'lucide-react';
import { ChatHistorySidebar } from "@/components/chat/ChatHistorySidebar";

// Import types
import { MessageWithAgent, ChatSession } from '@/types/chat';
import { TaxForm } from '@/types/tax-forms';


// type DisplayData = string | null;
type ViewMode = 'welcome' | 'chat' | 'tax-forms';

interface ProcessedEvent {
  title: string;
  data: any;
}

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithAgent[]>([]);
  // const [displayData, setDisplayData] = useState<DisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messageEvents, setMessageEvents] = useState<Map<string, ProcessedEvent[]>>(new Map());
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('welcome');
  const [currentTaxForm, setCurrentTaxForm] = useState<TaxForm | null>(null);
  const currentAgentRef = useRef('');
  const accumulatedTextRef = useRef("");
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  
  // Get API base URL from environment variable or fallback
  const getApiBase = () => {
    // First priority: environment variable
    if ((import.meta as any).env?.VITE_API_BASE_URL) {
      return (import.meta as any).env.VITE_API_BASE_URL;
    }
    
    // Second priority: local development
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return "http://127.0.0.1:8000";
    }
    
    // Final fallback - HTKK AI backend
    return "http://127.0.0.1:8000";
  };
  
  const API_BASE = getApiBase();
  
  console.log('[API_BASE] Using API base URL:', API_BASE);
  console.log('[API_BASE] Environment VITE_API_BASE_URL:', (import.meta as any).env?.VITE_API_BASE_URL);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const retryWithBackoff = async (
    fn: () => Promise<any>,
    maxRetries: number = 10,
    maxDuration: number = 120000 // 2 minutes
  ): Promise<any> => {
    const startTime = Date.now();
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (Date.now() - startTime > maxDuration) {
        throw new Error(`Retry timeout after ${maxDuration}ms`);
      }
      
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  };

  const createSession = async (): Promise<{userId: string, sessionId: string, appName: string}> => {
    const generatedSessionId = uuidv4();
    const url = `${API_BASE}/apps/htkk_agents/users/user/sessions`;
    
    console.log('[CREATE_SESSION] Attempting to create session at:', url);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    
    console.log('[CREATE_SESSION] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CREATE_SESSION] Error response:', errorText);
      throw new Error(`Failed to create session: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const data = await response.json();
    console.log('[CREATE_SESSION] Success response:', data);
    return {
      userId: data.userId || 'user',
      sessionId: data.id || generatedSessionId,
      appName: data.appName || 'htkk_agents'
    };
  };

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      // ADK server doesn't have /api/v1/health endpoint, so we check /docs instead
      console.log('[BACKEND_HEALTH] Checking backend health at:', `${API_BASE}/docs`);
      const response = await fetch(`${API_BASE}/docs`, {
        method: "GET",
        headers: {
          "Content-Type": "text/html"
        }
      });
      console.log('[BACKEND_HEALTH] Response status:', response.status);
      return response.ok;
    } catch (error) {
      console.log("[BACKEND_HEALTH] Backend not ready yet:", error);
      return false;
    }
  };

  // Function to extract text and metadata from SSE data
  const extractDataFromSSE = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      console.log('[SSE PARSED EVENT]:', JSON.stringify(parsed, null, 2));

      let textParts: string[] = [];
      let agent = '';
      let finalReportWithCitations = undefined;
      let functionCall = null;
      let functionResponse = null;
      let sources = null;

      // Check if content.parts exists and has text
      if (parsed.content && parsed.content.parts) {
        textParts = parsed.content.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text);
        
        // Check for function calls
        const functionCallPart = parsed.content.parts.find((part: any) => part.functionCall);
        if (functionCallPart) {
          functionCall = functionCallPart.functionCall;
        }
        
        // Check for function responses
        const functionResponsePart = parsed.content.parts.find((part: any) => part.functionResponse);
        if (functionResponsePart) {
          functionResponse = functionResponsePart.functionResponse;
        }
      }

      // Extract agent information
      if (parsed.author) {
        agent = parsed.author;
        console.log('[SSE EXTRACT] Agent:', agent);
      }

      if (
        parsed.actions &&
        parsed.actions.stateDelta &&
        parsed.actions.stateDelta.final_report_with_citations
      ) {
        finalReportWithCitations = parsed.actions.stateDelta.final_report_with_citations;
      }

      // Extract website count from research agents
      let sourceCount = 0;
      if (parsed.actions && parsed.actions.stateDelta) {
        const stateDelta = parsed.actions.stateDelta;
        if (stateDelta.sources) sourceCount += Array.isArray(stateDelta.sources) ? stateDelta.sources.length : 0;
        if (stateDelta.search_results) sourceCount += Array.isArray(stateDelta.search_results) ? stateDelta.search_results.length : 0;
        if (stateDelta.knowledge_sources) sourceCount += Array.isArray(stateDelta.knowledge_sources) ? stateDelta.knowledge_sources.length : 0;
      }

      if (sourceCount > 0) {
        sources = sourceCount;
      }

      return { textParts, agent, finalReportWithCitations, functionCall, functionResponse, sources };
    } catch (error) {
      console.error('[SSE EXTRACT] Error parsing SSE data:', error);
      return { textParts: [], agent: '', finalReportWithCitations: undefined, functionCall: null, functionResponse: null, sources: null };
    }
  };

  const processSseEventData = (jsonData: string, aiMessageId: string) => {
    const { textParts, agent, finalReportWithCitations, functionCall, functionResponse, sources } = extractDataFromSSE(jsonData);

    if (agent && agent !== currentAgentRef.current) {
      currentAgentRef.current = agent;
    }

    if (functionCall) {
      const functionCallTitle = `🔧 ${functionCall.name}`;
      console.log('[SSE HANDLER] Adding Function Call timeline event:', functionCallTitle);
      setMessageEvents(prev => new Map(prev).set(aiMessageId, [...(prev.get(aiMessageId) || []), {
        title: functionCallTitle,
        data: { type: 'functionCall', name: functionCall.name, args: functionCall.args, id: functionCall.id }
      }]));
    }

    if (functionResponse) {
      const functionResponseTitle = `✅ ${functionResponse.name}`;
      console.log('[SSE HANDLER] Adding Function Response timeline event:', functionResponseTitle);
      setMessageEvents(prev => new Map(prev).set(aiMessageId, [...(prev.get(aiMessageId) || []), {
        title: functionResponseTitle,
        data: { type: 'functionResponse', name: functionResponse.name, response: functionResponse.response, id: functionResponse.id }
      }]));
    }

    if (textParts.length > 0) {
      const newText = textParts.join(' ');
      console.log('[SSE HANDLER] Text parts found:', textParts);
      
      if (newText.trim()) {
        accumulatedTextRef.current += newText;
        console.log('[SSE HANDLER] Accumulated text:', accumulatedTextRef.current);
        
        // Update the AI message with accumulated text
        setMessages(prev => {
          const updated = [...prev];
          const aiMessageIndex = updated.findIndex(m => m.id === aiMessageId);
          if (aiMessageIndex !== -1) {
            updated[aiMessageIndex] = {
              ...updated[aiMessageIndex],
              content: accumulatedTextRef.current,
              agent: agent || updated[aiMessageIndex].agent
            };
          }
          return updated;
        });
      }
    }

    if (finalReportWithCitations) {
      console.log('[SSE HANDLER] Final report found, updating message');
      setMessages(prev => {
        const updated = [...prev];
        const aiMessageIndex = updated.findIndex(m => m.id === aiMessageId);
        if (aiMessageIndex !== -1) {
          updated[aiMessageIndex] = {
            ...updated[aiMessageIndex],
            content: finalReportWithCitations,
            finalReportWithCitations: true,
            agent: agent || updated[aiMessageIndex].agent
          };
        }
        return updated;
      });
    }

    if (sources) {
      console.log(`[SSE HANDLER] Found ${sources} sources, adding timeline event`);
      setMessageEvents(prev => new Map(prev).set(aiMessageId, [...(prev.get(aiMessageId) || []), {
        title: `📚 Tìm thấy ${sources} nguồn thông tin`,
        data: { type: 'sources', count: sources }
      }]));
    }
  };

  const runAgent = async (query: string, imageFile?: File, audioFile?: File, documentFile?: File, sessionData?: {userId: string, sessionId: string, appName: string}): Promise<string> => {
    console.log('[RUN AGENT] Starting with query:', query);
    
    // Use provided session data or current state
    const currentUserId = sessionData?.userId || userId;
    const currentSessionId = sessionData?.sessionId || sessionId;
    const currentAppName = sessionData?.appName || appName;
    
    if (!currentUserId || !currentSessionId || !currentAppName) {
      throw new Error("Session not initialized");
    }
    
    console.log('[RUN AGENT] Using session:', { currentUserId, currentSessionId, currentAppName });

    // Create parts array
    const parts: any[] = [{ text: query }];
    
    // Add image if provided
    if (imageFile) {
      const base64Image = await fileToBase64(imageFile);
      parts.push({
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image.split(',')[1] // Remove data:image/jpeg;base64, prefix
        }
      });
    }
    
    // Add audio if provided
    if (audioFile) {
      const base64Audio = await fileToBase64(audioFile);
      parts.push({
        inlineData: {
          mimeType: audioFile.type,
          data: base64Audio.split(',')[1] // Remove data:audio/...;base64, prefix
        }
      });
    }

    // Add document if provided
    if (documentFile) {
      try {
        // Upload to Cloudflare R2 first, pass R2 URL to the agent for OCR
        const { cloudflareR2Service } = await import('@/services/cloudflare-r2');
        const { privacyManager } = await import('@/services/privacy-manager');
        const defaultTier = (privacyManager.getPrivacyTierRecommendations?.(5, 'medium', [])?.recommendedTier) || 'premium';
        const upload = await cloudflareR2Service.uploadDocument(documentFile, defaultTier as any, currentSessionId!, currentUserId!);
        if (upload.success && upload.url) {
          parts.push({ text: `R2_FILE_URL: ${upload.url}\nFILE_TYPE: ${documentFile.type.includes('xml') ? 'xml' : 'pdf'}\nHãy đọc từ URL này bằng tool process_r2_document, sau đó map sang form phù hợp và chuyển cho form_agent để export_form_to_xml. Trả về xml_content.` });
        } else {
          // Fallback to inline base64 if upload fails
          const base64Document = await fileToBase64(documentFile);
          parts.push({
            inlineData: {
              mimeType: documentFile.type,
              data: base64Document.split(',')[1]
            }
          });
        }
      } catch (e) {
        // Fallback to inline base64 on any error
        const base64Document = await fileToBase64(documentFile);
        parts.push({
          inlineData: {
            mimeType: documentFile.type,
            data: base64Document.split(',')[1]
          }
        });
      }
    }

    const requestBody = {
      appName: currentAppName,
      userId: currentUserId,
      sessionId: currentSessionId,
      newMessage: {
        parts,
        role: "user"
      },
      streaming: true
    };

    console.log('[RUN AGENT] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${API_BASE}/run_sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[RUN AGENT] API Error:', response.status, errorText);
      
      // If session not found, throw specific error to trigger session recreation
      if (response.status === 404 && errorText.includes('Session not found')) {
        throw new Error('SESSION_NOT_FOUND');
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return new Promise((resolve, reject) => {
      const reader = response.body?.getReader();
      if (!reader) {
        reject(new Error('No response body reader available'));
        return;
      }

      // Create AI message immediately
      const aiMessageId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
        type: "ai",
        content: "",
        id: aiMessageId,
        agent: currentAgentRef.current
      }]);

      // Reset accumulated text for new response
      accumulatedTextRef.current = "";

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  console.log('[SSE] Stream completed');
                  resolve(accumulatedTextRef.current);
                  return;
                }
                
                if (data.trim()) {
                  console.log('[SSE] Received:', data);
                  processSseEventData(data, aiMessageId);
                }
              }
            }
          }
          
          console.log('[SSE] Reader finished without [DONE] marker');
          resolve(accumulatedTextRef.current);
        } catch (error) {
          console.error('[SSE] Stream processing error:', error);
          reject(error);
        }
      };

      processStream();
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = useCallback(async (query: string, imageFile: File | null = null, audioFile: File | null = null, documentFile: File | null = null) => {
    if (!query.trim() && !imageFile && !audioFile && !documentFile) return;

    setIsLoading(true);
    setViewMode('chat'); // Switch to chat view when submitting
    
    try {
      // Create session if it doesn't exist
      let currentUserId = userId;
      let currentSessionId = sessionId;
      let currentAppName = appName;
      
      if (!currentSessionId || !currentUserId || !currentAppName) {
        console.log('Creating new session...');
        const sessionData = await retryWithBackoff(createSession);
        currentUserId = sessionData.userId;
        currentSessionId = sessionData.sessionId;
        currentAppName = sessionData.appName;
        
        setUserId(currentUserId);
        setSessionId(currentSessionId);
        setAppName(currentAppName);
        console.log('Session created successfully:', { currentUserId, currentSessionId, currentAppName });
      }

      // Add user message to chat
      const userMessageId = Date.now().toString();
      let displayContent = "";
      
      if (query) {
        displayContent = query;
      } else if (audioFile) {
        displayContent = "🎤 Voice message";
      } else if (imageFile) {
        displayContent = "📷 Image";
      } else if (documentFile) {
        displayContent = "📄 Document";
      }
      
      // Handle combinations
      const attachments = [];
      if (audioFile) attachments.push("🎤");
      if (imageFile) attachments.push("📷");
      if (documentFile) attachments.push("📄");
      
      if (query && attachments.length > 0) {
        displayContent = `${query} ${attachments.join("")}`;
      } else if (!query && attachments.length > 1) {
        const labels = [];
        if (audioFile) labels.push("Voice");
        if (imageFile) labels.push("Image");
        if (documentFile) labels.push("Document");
        displayContent = `${attachments.join("")} ${labels.join(" + ")}`;
      }

      const userMessage: MessageWithAgent = {
        type: "human",
        content: displayContent,
        id: userMessageId,
      };

      setMessages(prev => [...prev, userMessage]);

      // Get agent response
      await runAgent(query || "Process this media", imageFile || undefined, audioFile || undefined, documentFile || undefined, {
        userId: currentUserId!,
        sessionId: currentSessionId!,
        appName: currentAppName!
      });

    } catch (error) {
      console.error('[HANDLE_SUBMIT] Error during submit:', error);
      
      // Handle session not found error by recreating session and retrying
      if (error instanceof Error && error.message === 'SESSION_NOT_FOUND') {
        console.log('[HANDLE_SUBMIT] Session not found, creating new session and retrying...');
        try {
          // Reset session
          setSessionId(null);
          setUserId(null);
          setAppName(null);
          
          // Create new session
          const sessionData = await retryWithBackoff(createSession);
          setUserId(sessionData.userId);
          setSessionId(sessionData.sessionId);
          setAppName(sessionData.appName);
          
          // Retry the request with new session
          await runAgent(query || "Process this media", imageFile || undefined, audioFile || undefined, documentFile || undefined, sessionData);
          return; // Success, exit function
        } catch (retryError) {
          console.error('[HANDLE_SUBMIT] Failed to recreate session:', retryError);
          error = retryError instanceof Error ? retryError : new Error('Failed to recreate session');
        }
      }
      
      let errorContent = `Xin lỗi, đã có lỗi xảy ra: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Add specific error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('Failed to create session')) {
          errorContent = `Lỗi kết nối backend: Không thể tạo session. Vui lòng kiểm tra kết nối và thử lại.`;
        } else if (error.message.includes('Failed to fetch')) {
          errorContent = `Lỗi kết nối: Không thể kết nối tới backend. Vui lòng kiểm tra kết nối mạng.`;
        }
      }
      
      const errorMessage: MessageWithAgent = {
        type: "ai",
        content: errorContent,
        id: (Date.now() + 2).toString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, sessionId, appName, API_BASE]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const checkBackend = async () => {
      setIsCheckingBackend(true);
      
      // Check if backend is ready with retry logic
      const maxAttempts = 60; // 2 minutes with 2-second intervals
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        const isReady = await checkBackendHealth();
        if (isReady) {
          setIsBackendReady(true);
          setIsCheckingBackend(false);
          return;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
      }
      
      // If we get here, backend didn't come up in time
      setIsCheckingBackend(false);
      console.error("Backend failed to start within 2 minutes");
    };
    
    checkBackend();
  }, []);

  const handleCancel = useCallback(() => {
    setMessages([]);
    // setDisplayData(null);
    setMessageEvents(new Map());
    setViewMode('welcome');
    // Reset session to create new one
    setSessionId(null);
    setUserId(null);
    setAppName(null);
    // Reset refs
    currentAgentRef.current = '';
    accumulatedTextRef.current = '';
  }, []);

  const BackendLoadingScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative bg-background">
      <Card className="w-full max-w-2xl border-2 border-primary/20 shadow-lg">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-3">
              <Calculator className="w-12 h-12 flex-shrink-0" />
              HTKK AI
            </h1>
            
            <div className="flex flex-col items-center space-y-4">
              {/* Spinning animation */}
              <div className="relative">
                <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-accent rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xl text-muted-foreground">
                  Đang khởi động hệ thống...
                </p>
                <p className="text-sm text-muted-foreground/80">
                  Quá trình này có thể mất vài phút lần đầu khởi động
                </p>
              </div>
              
              {/* Animated dots */}
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Derive humanMessages for sidebar
  const humanMessages = messages.filter((m) => m.type === "human").map((m) => ({ id: m.id, content: m.content }));

  // Session management handlers
  const handleSessionSelect = (session: ChatSession) => {
    setMessages(session.messages);
    setSessionId(session.id);
    setViewMode('chat');
  };

  const handleNewSession = () => {
    setMessages([]);
    // setDisplayData(null);
    setMessageEvents(new Map());
    setSessionId(null);
    setViewMode('welcome');
  };

  const handleTaxFormSelect = (formType: string) => {
    // Create a new tax form instance
    const newForm: TaxForm = {
      id: uuidv4(),
      formType,
      formCode: formType,
      title: `Tờ khai ${formType}`,
      description: `Tờ khai thuế ${formType}`,
      version: '1.0',
      status: 'draft',
      data: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setCurrentTaxForm(newForm);
    setViewMode('tax-forms');
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans antialiased">
      {/* Sidebar */}
      <ChatHistorySidebar
        humanMessages={humanMessages}
        currentMessages={messages}
        currentSessionId={sessionId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        {/* Header with navigation */}
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg bg-card border shadow-sm hover:bg-card/80 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <Calculator className="w-6 h-6" />
              HTKK AI
            </h1>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chat')}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat AI
            </Button>
            <Button
              variant={viewMode === 'tax-forms' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tax-forms')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Tờ khai thuế
            </Button>

          </div>
        </div>

        {isCheckingBackend ? (
          <BackendLoadingScreen />
        ) : !isBackendReady ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-background">
            <Card className="border-2 border-destructive/20 shadow-lg">
              <CardContent className="p-8 text-center space-y-4">
                <h2 className="text-2xl font-bold text-destructive">Backend Không Khả Dụng</h2>
                <p className="text-muted-foreground">
                  Không thể kết nối với backend tại {API_BASE}
                </p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  className="mt-4"
                >
                  Thử lại
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {viewMode === 'welcome' && (
              <WelcomeScreen
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                onCancel={handleCancel}
                onTaxFormSelect={handleTaxFormSelect}
              />
            )}
            
            {viewMode === 'chat' && (
              <ChatMessagesView
                messages={messages}
                isLoading={isLoading}
                scrollAreaRef={scrollAreaRef as React.RefObject<HTMLDivElement>}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                messageEvents={messageEvents}
              />
            )}
            
            {viewMode === 'tax-forms' && (
              <TaxFormView
                currentForm={currentTaxForm}
                onFormSelect={handleTaxFormSelect}
                onFormSave={(form) => setCurrentTaxForm(form)}
              />
            )}
            

          </>
        )}
      </div>
    </div>
  );
}
