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

const withAction =
  <T extends (first: any, ...args: any[]) => any>(
    action: T,
    manager: MCPConnectionManager | null
  ) =>
  (
    ...args: Parameters<T> extends [any, ...infer Rest] ? Rest : never
  ):
    | (ReturnType<T> & {
        meta: Record<string, any>
      })
    | null => {
    if (!manager) {
      return null
    }
    return action(manager, ...args)
  }

export class MCPHost {
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
