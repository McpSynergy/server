import { MCPConnectionManager } from './host'
import { withTimeoutPromise } from './utils'

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

export const toolCall = async ({
  manager,
  serverName,
  toolName,
  toolArgs,
}: {
  manager: MCPConnectionManager
  serverName: string
  toolName: string
  toolArgs: Record<string, unknown>
}) => {
  const getActiveMcpConnections = () => manager.getAllConnections()
  const thatClient = getActiveMcpConnections().get(serverName)!
  const result = await thatClient.callToolWithReconnect(toolName, toolArgs)
  return result
}
