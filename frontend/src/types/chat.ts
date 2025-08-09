export interface MessageWithAgent {
  id: string
  type: "human" | "ai"
  content: string
  agent?: string
  finalReportWithCitations?: boolean
  timestamp?: string
}

export interface ChatSession {
  id: string
  userId: string
  messages: MessageWithAgent[]
  createdAt: string
  updatedAt: string
  title?: string
}

export interface ChatHistoryState {
  sessions: ChatSession[]
  currentSessionId: string | null
}

export interface ProcessedEvent {
  title: string
  data: any
}

export interface AgentResponse {
  content: string
  agent: string
  functionCalls?: FunctionCall[]
  sources?: number
}

export interface FunctionCall {
  id: string
  name: string
  args: Record<string, any>
  response?: any
}
