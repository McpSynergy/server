#!/usr/bin/env node

import { MCPConnectionManager } from './host.js'
import { createHostServer } from './server.js'
import { logHost, errorHost } from './colors.js'

let connectionManager: MCPConnectionManager | null = null

async function main() {
  try {
    // 创建连接管理器
    connectionManager = new MCPConnectionManager({
      configPath: './mcp_servers.config.json',
    })

    // 创建并启动 Host 服务器
    await createHostServer(connectionManager)

    // 启动时创建所有已安装的服务连接
    connectionManager.start()

    // 添加进程退出处理
    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  } catch (error) {
    errorHost('启动失败', error)
    process.exit(1)
  }
}

async function cleanup() {
  logHost('正在关闭服务...')
  if (connectionManager) {
    await connectionManager.stop()
  }
  process.exit(0)
}

main()
