import { getTools, toolCall } from './actions'
import { MCPConnectionManager } from './host'

let connectionManager: MCPConnectionManager | null = null
const init = () => {
  connectionManager = new MCPConnectionManager()
  connectionManager.start()
  return connectionManager
}

const connectionActions = {
  getTools,
  toolCall,
}

export { init, connectionActions }
