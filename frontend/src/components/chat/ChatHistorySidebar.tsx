import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  X, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Calendar,
  Search
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { MessageWithAgent, ChatSession } from '@/types/chat';
import { 
  createSessionFromMessages, 
  saveSessionsToStorage, 
  loadSessionsFromStorage 
} from '@/utils/sessionUtils';

interface ChatHistorySidebarProps {
  humanMessages: { id: string; content: string }[];
  currentMessages: MessageWithAgent[];
  currentSessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSessionSelect: (session: ChatSession) => void;
  onNewSession: () => void;
}

export function ChatHistorySidebar({
  humanMessages,
  currentMessages,
  currentSessionId,
  isOpen,
  onClose,
  onSessionSelect,
  onNewSession
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Load sessions from localStorage on mount
  useEffect(() => {
    const loadedSessions = loadSessionsFromStorage();
    setSessions(loadedSessions);
  }, []);

  // Save current session when messages change
  useEffect(() => {
    if (currentMessages.length > 0 && currentSessionId) {
      const currentSession = createSessionFromMessages(currentMessages, currentSessionId);
      
      setSessions(prev => {
        const existingIndex = prev.findIndex(s => s.id === currentSessionId);
        let updated;
        
        if (existingIndex >= 0) {
          // Update existing session
          updated = [...prev];
          updated[existingIndex] = currentSession;
        } else {
          // Add new session
          updated = [currentSession, ...prev];
        }
        
        // Save to localStorage
        saveSessionsToStorage(updated);
        return updated;
      });
    }
  }, [currentMessages, currentSessionId]);

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      saveSessionsToStorage(updated);
      return updated;
    });
    
    // If deleting current session, start new session
    if (sessionId === currentSessionId) {
      onNewSession();
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.messages.some(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hôm nay';
    if (diffDays === 2) return 'Hôm qua';
    if (diffDays <= 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const groups: { [key: string]: ChatSession[] } = {};
    
    sessions.forEach(session => {
      const date = formatDate(session.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
    });
    
    return groups;
  };

  const sessionGroups = groupSessionsByDate(filteredSessions);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-card border-r border-border
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isOpen ? 'lg:block' : 'lg:block'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Lịch sử chat
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onNewSession}
                className="h-8 w-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 lg:hidden"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm cuộc trò chuyện..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Sessions List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {Object.keys(sessionGroups).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
                  <p className="text-xs mt-1">Bắt đầu chat để tạo lịch sử</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(sessionGroups).map(([date, groupSessions]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {date}
                      </div>
                      <div className="space-y-1">
                        {groupSessions.map((session) => (
                          <div
                            key={session.id}
                            className={`
                              group relative p-3 rounded-lg cursor-pointer transition-colors
                              ${session.id === currentSessionId 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'hover:bg-muted/50'
                              }
                            `}
                            onClick={() => {
                              onSessionSelect(session);
                              onClose();
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium truncate">
                                  {session.title || 'Cuộc trò chuyện mới'}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {session.messages[0]?.content || 'Không có tin nhắn'}
                                </p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <span>{session.messages.length} tin nhắn</span>
                                  <span>•</span>
                                  <span>{new Date(session.updatedAt).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}</span>
                                </div>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => deleteSession(session.id, e)}
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={onNewSession}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cuộc trò chuyện mới
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
