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
const initialization = () => {
  connectionManager = new MCPConnectionManager()
  connectionManager.start()
  return connectionManager
}

const shutdown = () => {
  connectionManager?.stop()
  connectionManager = null
}

const withAction =
  <T extends (first: any, ...args: any[]) => any>(action: T) =>
  (...args: Parameters<T> extends [any, ...infer Rest] ? Rest : never): ReturnType<T> | null => {
    if (!connectionManager) {
      return null
    }
    return action(connectionManager, ...args)
  }

const connectionActions = {
  getTools: withAction(getTools),
  toolCall: withAction(toolCall),
  toolsBatch: withAction(toolsBatch),
  getResources: withAction(getResources),
  readResource: withAction(readResource),
  updateConnections: withAction(updateConnections),
  batchInstallServer: withAction(batchInstallServer),
  uninstallServer: withAction(batchInstallServer),
}

export { initialization, shutdown, connectionActions }
