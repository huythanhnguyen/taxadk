import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Upload, 
  Bot, 
  User, 
  FileText, 
  Image as ImageIcon,
  Mic,
  X,
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
  onSubmit: (query: string, imageFile?: File | null, audioFile?: File | null) => void;
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
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() || selectedFile) {
      onSubmit(inputValue, selectedFile);
      setInputValue("");
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        <div className="max-w-4xl mx-auto">
          {/* File preview */}
          {selectedFile && (
            <div className="mb-3 p-3 bg-muted rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Nhập tin nhắn của bạn..."
                  className="min-h-[60px] max-h-[120px] resize-none"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xml,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="h-10 w-10 p-0"
                >
                  <Upload className="w-4 h-4" />
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading || (!inputValue.trim() && !selectedFile)}
                  className="h-10 w-10 p-0"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Nhấn Enter để gửi, Shift+Enter để xuống dòng</span>
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
          </form>
        </div>
      </div>
    </div>
  );
}
