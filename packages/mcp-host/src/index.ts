import {
  batchInstallServer,
  getResources,
  getTools,
  readResource,
  toolCall,
  toolsBatch,
  updateConnections,
} from './actions'
import { MCPConnectionManager } from './host'

let connectionManager: MCPConnectionManager | null = null
const initialization = (configPath: string, dev?: boolean) => {
  connectionManager = new MCPConnectionManager({
    configPath,
    dev,
  })
  connectionManager.start()
  return connectionManager
}

const shutdown = () => {
  connectionManager?.stop()
  connectionManager = null
}

const withAction =
  <T extends (first: any, ...args: any[]) => any>(
    action: T,
    manager: MCPConnectionManager | null
  ) =>
  (...args: Parameters<T> extends [any, ...infer Rest] ? Rest : never): ReturnType<T> | null => {
    if (!manager) {
      return null
    }
    return action(manager, ...args)
  }

const mcpHost = {
  initialization,
  shutdown,
  getTools: withAction(getTools, connectionManager),
  toolCall: withAction(toolCall, connectionManager),
  toolsBatch: withAction(toolsBatch, connectionManager),
  getResources: withAction(getResources, connectionManager),
  readResource: withAction(readResource, connectionManager),
  updateConnections: withAction(updateConnections, connectionManager),
  batchInstallServer: withAction(batchInstallServer, connectionManager),
  uninstallServer: withAction(batchInstallServer, connectionManager),
}

export class MCPHost {
  private static instance: MCPHost
  private connectionManager: MCPConnectionManager | null = null
  constructor(configPath: string, dev?: boolean) {
    this.connectionManager = new MCPConnectionManager({
      configPath,
      dev,
    })
  }
  start() {
    this.connectionManager?.start()
  }
  shutdown() {
    this.connectionManager?.stop()
  }
  getTools = withAction(getTools, this.connectionManager)
  toolCall = withAction(toolCall, this.connectionManager)
  toolsBatch = withAction(toolsBatch, this.connectionManager)
  getResources = withAction(getResources, this.connectionManager)
  readResource = withAction(readResource, this.connectionManager)
  updateConnections = withAction(updateConnections, this.connectionManager)
  batchInstallServer = withAction(batchInstallServer, this.connectionManager)
  uninstallServer = withAction(batchInstallServer, this.connectionManager)
}

export default mcpHost
