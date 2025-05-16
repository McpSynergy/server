import { MCPClient } from './client.js'
import { MCPClientConfig, MCPConnectionStatus, MCPServerConfig } from './types.js'
import { convertToClientConfig, getMcpComponentConfig, getServerConfig } from './utils.js'
import { isDeepStrictEqual } from 'node:util'
import chokidar, { FSWatcher } from 'chokidar'
import { logHost, errorHost } from './colors.js'
import fs from 'fs/promises'
import * as jsondiffpatch from 'jsondiffpatch'

interface ConfigChange {
  timestamp: number
  path: string
  changes: {
    added: any[]
    removed: any[]
    modified: any[]
  }
}

interface ConfigHistory {
  initialConfig: string
  changes: ConfigChange[]
}

export interface MCPHostConfig {
  mcpServer: {
    configPath: string
  }
  /**
   * 它不是 mcpclient 的配置，而是使用了 mcp component 或者是云函数的配置
   */
  mcpComponent: {
    configPath: string
  }
  watch: boolean
}

export class MCPConnectionManager {
  private connections = new Map<string, MCPClient>()
  private connectionStatus = new Map<string, MCPConnectionStatus>()
  private configCache = new Map<string, MCPServerConfig>()

  // 分别存储 server 和 component 的配置历史
  private serverConfigHistory: ConfigHistory = {
    initialConfig: '',
    changes: []
  }
  private componentConfigHistory: ConfigHistory = {
    initialConfig: '',
    changes: []
  }

  private refreshInProgress = false // 是否有正在进行中的更新操作

  // 存储连接请求
  private connectionPromises = new Map<string, Promise<MCPClient>>()

  private configPath: string

  private mcpComponent: MCPHostConfig['mcpComponent']

  private watcher?: FSWatcher


  constructor(options: MCPHostConfig) {
    const { mcpServer, mcpComponent, watch } = options
    this.configPath = mcpServer.configPath
    this.startWatch(mcpServer.configPath, watch, () => {
      this.refreshConnections()
    })
    this.startWatch(mcpComponent.configPath, watch, async () => {
      this.refreshConnections(true)
    })
    this.mcpComponent = mcpComponent
    this.start()
  }

  startWatch(path: string, watch: boolean, callback: (newVal: string) => void) {
    if (watch) {
      this.watcher = chokidar.watch(path, {
        persistent: true,
      })
      logHost(`Watching config file <${path}> for changes...`)

      // 首次启动时读取并保存初始配置
      fs.readFile(path, 'utf-8').then(content => {
        if (path === this.configPath) {
          this.serverConfigHistory.initialConfig = content
        } else {
          this.componentConfigHistory.initialConfig = content
        }
        logHost(`Initial config saved for <${path}>`)
      }).catch(error => {
        errorHost(`Failed to read initial config for <${path}>:`, error)
      })

      this.watcher.on('change', async (path) => {
        logHost(`Config file <${path}> has changed, updating connections...`)
        try {

          // 读取新文件内容
          const newContent = await fs.readFile(path, 'utf-8')

          // 调用回调函数
          callback(newContent)

          await this.refreshConnections()
          logHost('Connections updated successfully')
        } catch (error) {
          errorHost(`Failed to read config file <${path}>:`, error)
        }
      })
    }
  }

  // 获取最近的服务器配置变化
  getRecentServerChanges(count: number = 5): ConfigChange[] {
    return this.serverConfigHistory.changes.slice(-count)
  }

  // 获取最近的组件配置变化
  getRecentComponentChanges(count: number = 5): ConfigChange[] {
    return this.componentConfigHistory.changes.slice(-count)
  }

  // 获取指定时间范围内的服务器配置变化
  getServerChangesInTimeRange(startTime: number, endTime: number): ConfigChange[] {
    return this.serverConfigHistory.changes.filter(change =>
      change.timestamp >= startTime && change.timestamp <= endTime
    )
  }

  // 获取指定时间范围内的组件配置变化
  getComponentChangesInTimeRange(startTime: number, endTime: number): ConfigChange[] {
    return this.componentConfigHistory.changes.filter(change =>
      change.timestamp >= startTime && change.timestamp <= endTime
    )
  }

  // 清空服务器配置变化历史
  clearServerChangesHistory() {
    this.serverConfigHistory.changes = []
  }

  // 清空组件配置变化历史
  clearComponentChangesHistory() {
    this.componentConfigHistory.changes = []
  }

  // 启动连接管理器
  async start(): Promise<void> {
    await this.refreshConnections()
  }

  async getServerConfig(): Promise<MCPServerConfig[]> {
    return getServerConfig(this.configPath)
  }

  // 更新所有连接
  async refreshConnections(forceUpdate: boolean = false): Promise<void> {
    // 防止并发执行
    if (this.refreshInProgress) {
      logHost('Connection update operation in progress, skipping refresh')
      return
    }
    this.refreshInProgress = true

    try {
      const mcpServerList = await this.getServerConfig()
      if (!mcpServerList?.length) {
        logHost('Config file is empty, skipping refresh')
        return
      }

      // 构建配置映射
      const newConfigMap = new Map<string, MCPServerConfig>()
      mcpServerList.forEach((server: MCPServerConfig) => {
        newConfigMap.set(server.server_name, server)
      })

      // 获取当前所有服务器名称
      const currentServers = new Set(this.connections.keys())
      const newServers = new Set(newConfigMap.keys())

      // 处理需要删除的服务器
      for (const serverName of currentServers) {
        if (!newServers.has(serverName)) {
          logHost(`Server <${serverName}> has been removed, disconnecting...`)
          await this.removeConnection(serverName)
        }
      }

      // 处理新增和修改的服务器
      for (const [serverName, newConfig] of newConfigMap.entries()) {
        const oldConfig = this.configCache.get(serverName)

        if (newConfig.enabled) {
          try {
            if (!this.connections.has(serverName)) {
              // 新增启用的服务
              logHost(`New server <${serverName}> detected, creating connection...`)
              await this.createConnection(serverName, convertToClientConfig(newConfig))
            } else if (this.configNeedsUpdate(oldConfig, newConfig) || forceUpdate) {
              // 配置已变更，需要重启连接
              logHost(`Server <${serverName}> configuration changed, restarting connection...`)
              await this.restartConnection(serverName, newConfig)
            }
          } catch (error) {
            errorHost(
              `Error processing server <${serverName}> connection, continuing with other servers:`,
              error
            )
          }
        } else if (this.connections.has(serverName)) {
          // 服务被禁用
          logHost(`Server <${serverName}> has been disabled, disconnecting...`)
          await this.removeConnection(serverName)
        }
      }

      // 更新配置缓存
      this.configCache = new Map<string, MCPServerConfig>()
      for (const [serverName, config] of newConfigMap.entries()) {
        this.configCache.set(serverName, { ...config })
      }

      logHost('All connections have been updated successfully')
    } catch (error) {
      errorHost('Failed to update connections:', error)
    } finally {
      this.refreshInProgress = false
    }
  }

  // 创建新连接
  async createConnection(serverName: string, config: MCPClientConfig): Promise<MCPClient> {
    const mcpComponentConfig = await getMcpComponentConfig(this.mcpComponent.configPath)
    // 检查是否已有正在进行的连接请求
    const existingPromise = this.connectionPromises.get(serverName)
    if (existingPromise) {
      logHost(`Server <${serverName}> connection is being established, waiting for completion`)
      return existingPromise
    }

    // 创建新的连接请求
    const connectionPromise = (async () => {
      try {
        this.connectionStatus.set(serverName, 'connecting')

        // 获取 mcpComponentConfig 中 serverName 对应的组件配置，可能是多个
        const componentConfig =
          mcpComponentConfig.filter((item) => item.serverName === serverName) ?? []
        console.log('创建新的连接', serverName, {
          componentConfig,
        })
        const client = new MCPClient(config, componentConfig)
        await client.connectToServer()
        this.connections.set(serverName, client)
        this.connectionStatus.set(serverName, 'connected')
        logHost(`Server <${serverName}> connection successful`)
        return client
      } catch (error) {
        this.connectionStatus.set(serverName, 'error')
        errorHost(`Server <${serverName}> connection failed:`, error)
        throw error
      } finally {
        // 清理 Promise 缓存
        this.connectionPromises.delete(serverName)
      }
    })()

    // 存储 Promise
    this.connectionPromises.set(serverName, connectionPromise)

    return connectionPromise
  }

  // 重启连接
  async restartConnection(serverName: string, config: MCPServerConfig): Promise<MCPClient> {
    try {
      await this.removeConnection(serverName)
      const client = await this.createConnection(serverName, convertToClientConfig(config))
      return client
    } catch (error) {
      // 出错时清理连接
      await this.removeConnection(serverName)
      throw error
    }
  }

  // 移除 Server 连接
  async removeConnection(serverName: string): Promise<void> {
    const client = this.connections.get(serverName)
    if (client) {
      try {
        await client.cleanup()
        this.connections.delete(serverName)
        this.connectionStatus.set(serverName, 'disconnected')
        logHost(`Successfully removed server <${serverName}> connection`)
      } catch (error) {
        errorHost(`Failed to remove server <${serverName}> connection:`, error)
        throw error
      }
    }
  }

  // 检查服务配置是否需要更新
  private configNeedsUpdate(
    oldConfig: MCPServerConfig | undefined,
    newConfig: MCPServerConfig
  ): boolean {
    return !isDeepStrictEqual(oldConfig, newConfig)
  }

  // 获取连接状态
  getConnectionStatus(): Map<string, MCPConnectionStatus> {
    return this.connectionStatus
  }

  // 获取所有连接
  getAllConnections(): Map<string, MCPClient> {
    return this.connections
  }

  // 停止连接管理器
  async stop(): Promise<void> {
    await this.closeAllConnections()
  }

  // 关闭所有连接
  closeAllConnections() {
    Promise.all(this.getAllServers().map((serverName) => this.removeConnection(serverName)))
      .then(() => {
        logHost('All connections have been closed')
        this.connections.clear()
      })
      .catch((error) => {
        errorHost('Failed to close all connections:', error)
        throw error
      })
  }

  // 获取所有服务器
  getAllServers(): string[] {
    return Array.from(this.connections.keys())
  }

  // 获取所有客户端
  getAllClients(): MCPClient[] {
    return Array.from(this.connections.values())
  }

  // 获取特定客户端
  getClient(serverName: string): MCPClient | undefined {
    return this.connections.get(serverName)
  }

  // 获取配置缓存
  get getConfigCache(): Map<string, MCPServerConfig> {
    return this.configCache
  }
}
