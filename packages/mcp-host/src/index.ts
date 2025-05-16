import {
  batchInstallServer,
  getResources,
  getTools,
  readResource,
  toolCall,
  toolsBatch,
  updateConnections,
} from './actions'
import { MCPConnectionManager, MCPHostConfig } from './host'

export class MCPHost {
  private connectionManager: MCPConnectionManager | null = null
  constructor(config: MCPHostConfig) {
    const { mcpServer, mcpComponent, watch } = config
    this.connectionManager = new MCPConnectionManager({
      mcpServer,
      mcpComponent,
      watch,
    })
  }
  start() {
    this.connectionManager?.start()
  }
  shutdown() {
    this.connectionManager?.stop()
  }
  withAction =
    <T extends (first: any, ...args: any[]) => any>(action: T) =>
      (
        ...args: Parameters<T> extends [any, ...infer Rest] ? Rest : never
      ):
        | (ReturnType<T> & {
          meta: Record<string, any>
        })
        | null => {
        if (!this.connectionManager) {
          return null
        }
        return action(this.connectionManager, ...args)
      }
  getTools = this.withAction(getTools)
  toolCall = this.withAction(toolCall)
  toolsBatch = this.withAction(toolsBatch)
  getResources = this.withAction(getResources)
  readResource = this.withAction(readResource)
  updateConnections = this.withAction(updateConnections)
  batchInstallServer = this.withAction(batchInstallServer)
  uninstallServer = this.withAction(batchInstallServer)
}
