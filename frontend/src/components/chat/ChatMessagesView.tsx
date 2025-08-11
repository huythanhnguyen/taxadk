import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InputForm } from "@/components/InputForm";
import { 
  Bot, 
  User, 
  FileText, 
  Image as ImageIcon,
  Mic,
  Copy,
  Check
} from 'lucide-react';
import { MessageWithAgent } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface ChatMessagesViewProps {
  messages: MessageWithAgent[];
  isLoading: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  onSubmit: (query: string, imageFile?: File | null, audioFile?: File | null, documentFile?: File | null) => void;
  onCancel: () => void;
  displayData: string | null;
  messageEvents: Map<string, any[]>;
}

export function ChatMessagesView({
  messages,
  isLoading,
  scrollAreaRef,
  onSubmit,
  onCancel,
  displayData,
  messageEvents
}: ChatMessagesViewProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleInputSubmit = (query: string, imageFile: File | null, audioFile: File | null, documentFile?: File | null) => {
    onSubmit(query, imageFile, audioFile, documentFile);
  };



  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getAgentIcon = (agent?: string) => {
    if (!agent) return <Bot className="w-5 h-5" />;
    
    switch (agent.toLowerCase()) {
      case 'form_agent':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'ocr_agent':
        return <ImageIcon className="w-5 h-5 text-green-500" />;
      case 'tax_validator_agent':
        return <Bot className="w-5 h-5 text-purple-500" />;
      default:
        return <Bot className="w-5 h-5" />;
    }
  };

  const getAgentName = (agent?: string) => {
    if (!agent) return 'AI Assistant';
    
    switch (agent.toLowerCase()) {
      case 'form_agent':
        return 'Form Agent';
      case 'ocr_agent':
        return 'OCR Agent';
      case 'tax_validator_agent':
        return 'Tax Validator';
      default:
        return agent;
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === 'human' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'ai' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {getAgentIcon(message.agent)}
                </div>
              )}
              
              <div
                className={`max-w-[80%] ${
                  message.type === 'human'
                    ? 'bg-primary text-primary-foreground rounded-lg rounded-br-sm'
                    : 'bg-muted rounded-lg rounded-bl-sm'
                } p-4 shadow-sm`}
              >
                {message.type === 'ai' && message.agent && (
                  <div className="text-xs text-muted-foreground mb-2 font-medium">
                    {getAgentName(message.agent)}
                  </div>
                )}
                
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {message.type === 'ai' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        // Custom components for better styling
                        code: ({ node, inline, className, children, ...props }) => {
                          return inline ? (
                            <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                              {children}
                            </code>
                          ) : (
                            <pre className="bg-muted p-3 rounded-md overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          );
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>

                {/* Function calls timeline */}
                {messageEvents.has(message.id) && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="text-xs text-muted-foreground mb-2">Hoạt động:</div>
                    <div className="space-y-1">
                      {messageEvents.get(message.id)?.map((event, index) => (
                        <div key={index} className="text-xs bg-background/50 rounded px-2 py-1">
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy button for AI messages */}
                {message.type === 'ai' && (
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="h-6 px-2 text-xs"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {message.type === 'human' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-muted rounded-lg rounded-bl-sm p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                  <span className="text-sm text-muted-foreground">AI đang suy nghĩ...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto space-y-3">

          <InputForm 
            onSubmit={handleInputSubmit}
            isLoading={isLoading}
            context="chat"
          />
          
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Hỗ trợ text, voice, và hình ảnh • Space để ghi âm</span>
            {messages.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-6 px-2 text-xs"
              >
                Cuộc trò chuyện mới
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
