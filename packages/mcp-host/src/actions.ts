import { MCPConnectionManager } from './host'
import { withTimeoutPromise } from './utils'

// 添加服务器安装锁
const serverInstallLocks = new Map<string, Promise<any>>()

export const getTools = async (manager: MCPConnectionManager) => {
  await manager?.refreshConnections()
  const getActiveMcpConnections = () => manager.getAllConnections()
  const promises = []
  for (const [server_name, client] of getActiveMcpConnections().entries()) {
    promises.push(
      withTimeoutPromise(
        client.listTools().then((tools) => ({
          server_name,
          tools,
        })),
        5000, // 5秒超时
        { server_name, tools: [] } // 超时返回空工具列表
      )
    )
  }
  const toolsOfServers = (await Promise.allSettled(promises))
    .map((item) => {
      if (item.status === 'fulfilled') {
        return item.value
      }
      return null
    })
    .filter((item) => !!item)

  return toolsOfServers
}

export const toolCall = async (
  manager: MCPConnectionManager,
  {
    serverName,
    toolName,
    toolArgs,
  }: {
    serverName: string
    toolName: string
    toolArgs: Record<string, unknown>
  }
) => {
  const getActiveMcpConnections = () => manager.getAllConnections()
  const thatClient = getActiveMcpConnections().get(serverName)!
  const result = await thatClient.callToolWithReconnect(toolName, toolArgs)
  return result
}

export const toolsBatch = async (manager: MCPConnectionManager, serverNames: string[]) => {
  // 验证参数
  if (!Array.isArray(serverNames) || !serverNames.length) {
    return null
  }

  const getActiveMcpConnections = () => manager.getAllConnections()
  // 并行处理所有服务器连接
  const connectionPromises = serverNames.map(async (server_name) => {
    let client = getActiveMcpConnections().get(server_name)

    // 已有连接，直接复用
    if (client) {
      return { server_name, client, status: 'success' }
    }
    // 获取最新的服务器配置
    const serverConfigs = await manager?.getServerConfig()
    const serverConfig = serverConfigs?.find((c) => c.server_name === server_name)
    // 服务器配置不存在
    if (!serverConfig) {
      return {
        server_name,
        client: null,
        status: 'error',
        error: 'Server not found',
      }
    }

    // 服务器已禁用
    if (!serverConfig.enabled) {
      return {
        server_name,
        client: null,
        status: 'error',
        error: 'Server disabled',
      }
    }

    // 尝试建立连接
    try {
      client = await manager?.restartConnection(server_name, serverConfig)
      return { server_name, client, status: 'success' }
    } catch (error) {
      console.error(`创建服务器${server_name}连接失败:`, error)
      return {
        server_name,
        client: null,
        status: 'error',
        error: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  })
  // 等待所有连接处理完成
  const connectionResults = await Promise.all(connectionPromises)
  // 并行获取工具
  const toolPromises = connectionResults.map((result) => {
    if (result.status === 'error' || !result.client) {
      return Promise.resolve({
        server_name: result.server_name,
        tools: [],
      })
    }

    // 有可用连接时，获取工具并设置超时
    return withTimeoutPromise(
      result.client.listTools().then((tools) => ({
        server_name: result.server_name,
        tools,
      })),
      5000, // 5秒超时
      { server_name: result.server_name, tools: [] } // 超时返回空工具列表
    )
  })
  const toolsResults = await Promise.all(toolPromises)
  // 过滤掉空工具列表
  const filteredToolsResults = toolsResults.filter((item) => item.tools.length > 0)
  return filteredToolsResults
}

export const getResources = async (manager: MCPConnectionManager) => {
  await manager?.refreshConnections()
  const getActiveMcpConnections = () => manager.getAllConnections()
  const resourcesOfServers = []
  for (const [server_name, client] of getActiveMcpConnections().entries()) {
    const resources = await client.listResources()
    resourcesOfServers.push({
      server_name,
      resources,
    })
  }
  return resourcesOfServers
}

export const readResource = async (
  manager: MCPConnectionManager,
  {
    serverName,
    resourceUri,
  }: {
    serverName: string
    resourceUri: string
  }
) => {
  const getActiveMcpConnections = () => manager.getAllConnections()
  const thatClient = getActiveMcpConnections().get(serverName)!
  const result = await thatClient.readResource(resourceUri)
  return result
}

export const updateConnections = async (manager: MCPConnectionManager) => {
  try {
    await manager?.refreshConnections()
    return true
  } catch (error) {
    console.error('uodate error:', error)
    return false
  }
}

export const batchInstallServer = async (manager: MCPConnectionManager, serverNames: string[]) => {
  const getActiveMcpConnections = () => manager.getAllConnections()
  if (!Array.isArray(serverNames) || !serverNames.length) {
    return null
  }

  // 并行处理每个服务器的安装
  const installPromises = serverNames.map(async (server_name) => {
    // 检查服务器是否已存在连接
    const existingClient = getActiveMcpConnections().get(server_name)
    if (existingClient) {
      return {
        server_name,
        installed: true,
        msg: 'Server already exists',
      }
    }

    // 使用锁确保同一服务器不会被并发安装
    let installPromise = serverInstallLocks.get(server_name)
    if (!installPromise) {
      // 创建新的安装任务
      installPromise = (async () => {
        try {
          // 获取服务器配置
          const serverConfigs = await manager?.getServerConfig()
          const config = serverConfigs.find((c) => c.server_name === server_name)

          // 配置不存在
          if (!config) {
            return {
              server_name,
              installed: false,
              msg: 'Server config not found',
            }
          }

          // 服务已下线
          if (!config.enabled) {
            return {
              server_name,
              installed: false,
              msg: 'Server disabled',
            }
          }

          // 创建新连接
          await manager?.restartConnection(server_name, config)

          return {
            server_name,
            installed: true,
            msg: 'Server installed successfully',
          }
        } catch (error) {
          console.error('安装服务器失败:', error)
          return {
            server_name,
            installed: false,
            msg: `安装服务器失败: ${error instanceof Error ? error.message : '未知错误'}`,
          }
        } finally {
          // 无论成功失败，都要释放锁
          serverInstallLocks.delete(server_name)
        }
      })()

      // 设置锁
      serverInstallLocks.set(server_name, installPromise)
    }

    // 等待锁定的安装过程完成
    return await installPromise
  })
  // 等待所有安装完成
  const results = await Promise.all(installPromises)
  return results
}

export const uninstallServer = async (manager: MCPConnectionManager, serverName: string) => {
  if (!serverName) {
    return null
  }
  const getActiveMcpConnections = () => manager.getAllConnections()
  const existingClient = getActiveMcpConnections().get(serverName)

  if (!existingClient) {
    return {
      server_name: serverName,
      installed: false,
      msg: 'Server not exists',
    }
  }

  try {
    await manager?.removeConnection(serverName)
    return {
      server_name: serverName,
      installed: true,
      msg: 'Server uninstalled successfully',
    }
  } catch (error) {
    throw new Error('uninstall error')
  }
}
