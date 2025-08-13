export interface MCPClientConfig {
  /** 传输协议类型：stdio | sse */
  transportType: 'stdio' | 'sse' | 'streamable_http'

  /** 服务器配置（stdio需要命令参数，sse需要URL） */
  serverConfig: {
    command?: string
    args?: string[]
    env?: Record<string, string>
    cwd?: string
    sseUrl?: string
    /** Streamable HTTP endpoint URL */
    httpUrl?: string
    /** Optional HTTP headers for Streamable HTTP requests */
    httpHeaders?: Record<string, string>
    /** Optional session id for Streamable HTTP */
    httpSessionId?: string
    /** Reconnection options for Streamable HTTP */
    httpReconnectionOptions?: {
      maxReconnectionDelay?: number
      initialReconnectionDelay?: number
      reconnectionDelayGrowFactor?: number
      maxRetries?: number
    }
  }
}

/** Server 配置文件 */
export interface MCPServerConfig {
  enabled: boolean
  server_name: string
  type: 'stdio' | 'sse' | 'streamable_http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  sse_url?: string
  /** Streamable HTTP endpoint URL */
  http_url?: string
  /** Optional HTTP headers for Streamable HTTP requests */
  http_headers?: Record<string, string>
  /** Optional session id for Streamable HTTP */
  http_session_id?: string
  /** Reconnection options for Streamable HTTP */
  http_reconnection_options?: {
    maxReconnectionDelay?: number
    initialReconnectionDelay?: number
    reconnectionDelayGrowFactor?: number
    maxRetries?: number
  }
}

export interface MCPComponentConfig {
  name: string
  description: string
  serverName: string
  propertySchema: Record<string, any>
}

/** Server 连接状态 */
export type MCPConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'
