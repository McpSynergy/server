import { MCPConnectionManager } from './host'
import { createHostServer } from './server'

let connectionManager: MCPConnectionManager | null = null
// 创建连接管理器
connectionManager = new MCPConnectionManager()

const start = async () => {
  // 创建并启动 Host 服务器
  await createHostServer(connectionManager)
  connectionManager.start()
}

const mcpHostConnectionManager = {
  start,
  cleanup: async (onCleanup?: () => void) => {
    onCleanup?.()
    if (connectionManager) {
      await connectionManager.stop()
    }
    process.exit(0)
  },
}

export { mcpHostConnectionManager }
