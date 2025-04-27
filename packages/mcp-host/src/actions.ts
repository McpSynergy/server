import { MCPConnectionManager } from './host'
import { withTimeoutPromise } from './utils'

// Add server installation lock
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
        5000, // 5 seconds timeout
        { server_name, tools: [] } // Return empty tool list on timeout
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
  // Validate parameters
  if (!Array.isArray(serverNames) || !serverNames.length) {
    return null
  }

  const getActiveMcpConnections = () => manager.getAllConnections()
  // Process all server connections in parallel
  const connectionPromises = serverNames.map(async (server_name) => {
    let client = getActiveMcpConnections().get(server_name)

    // Reuse existing connection
    if (client) {
      return { server_name, client, status: 'success' }
    }
    // Get latest server configuration
    const serverConfigs = await manager?.getServerConfig()
    const serverConfig = serverConfigs?.find((c) => c.server_name === server_name)
    // Server configuration not found
    if (!serverConfig) {
      return {
        server_name,
        client: null,
        status: 'error',
        error: 'Server not found',
      }
    }

    // Server is disabled
    if (!serverConfig.enabled) {
      return {
        server_name,
        client: null,
        status: 'error',
        error: 'Server disabled',
      }
    }

    // Try to establish connection
    try {
      client = await manager?.restartConnection(server_name, serverConfig)
      return { server_name, client, status: 'success' }
    } catch (error) {
      console.error(`Failed to create server connection ${server_name}:`, error)
      return {
        server_name,
        client: null,
        status: 'error',
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  })
  // Wait for all connection processes to complete
  const connectionResults = await Promise.all(connectionPromises)
  // Get tools in parallel
  const toolPromises = connectionResults.map((result) => {
    if (result.status === 'error' || !result.client) {
      return Promise.resolve({
        server_name: result.server_name,
        tools: [],
      })
    }

    // When connection is available, get tools with timeout
    return withTimeoutPromise(
      result.client.listTools().then((tools) => ({
        server_name: result.server_name,
        tools,
      })),
      5000, // 5 seconds timeout
      { server_name: result.server_name, tools: [] } // Return empty tool list on timeout
    )
  })
  const toolsResults = await Promise.all(toolPromises)
  // Filter out empty tool lists
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
    console.error('Update error:', error)
    return false
  }
}

export const batchInstallServer = async (manager: MCPConnectionManager, serverNames: string[]) => {
  const getActiveMcpConnections = () => manager.getAllConnections()
  if (!Array.isArray(serverNames) || !serverNames.length) {
    return null
  }

  // Process each server installation in parallel
  const installPromises = serverNames.map(async (server_name) => {
    // Check if server connection already exists
    const existingClient = getActiveMcpConnections().get(server_name)
    if (existingClient) {
      return {
        server_name,
        installed: true,
        msg: 'Server already exists',
      }
    }

    // Use lock to ensure the same server won't be installed concurrently
    let installPromise = serverInstallLocks.get(server_name)
    if (!installPromise) {
      // Create new installation task
      installPromise = (async () => {
        try {
          // Get server configuration
          const serverConfigs = await manager?.getServerConfig()
          const config = serverConfigs.find((c) => c.server_name === server_name)

          // Configuration not found
          if (!config) {
            return {
              server_name,
              installed: false,
              msg: 'Server config not found',
            }
          }

          // Server is offline
          if (!config.enabled) {
            return {
              server_name,
              installed: false,
              msg: 'Server disabled',
            }
          }

          // Create new connection
          await manager?.restartConnection(server_name, config)

          return {
            server_name,
            installed: true,
            msg: 'Server installed successfully',
          }
        } catch (error) {
          console.error('Server installation failed:', error)
          return {
            server_name,
            installed: false,
            msg: `Server installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }
        } finally {
          // Release lock regardless of success or failure
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
