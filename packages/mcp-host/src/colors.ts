// 定义日志颜色工具

// 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

// MCP Host 使用蓝色
export function logHost(message: string) {
  return console.log(`${colors.blue}[MCP Host]${colors.reset} ${message}`)
}

export function errorHost(message: string, error?: any) {
  return console.error(`${colors.red}[MCP Host]${colors.reset} ${message}`, error ? error : '')
}

// MCP Client 使用青色
export function logClient(message: string) {
  return console.log(`${colors.cyan}[MCP Client]${colors.reset} ${message}`)
}

export function errorClient(message: string, error?: any) {
  return console.error(`${colors.red}[MCP Client]${colors.reset} ${message}`, error ? error : '')
}

// MCP Host Server 使用绿色
export function logServer(message: string) {
  return console.log(`${colors.green}[MCP Host Server]${colors.reset} ${message}`)
}

export function errorServer(message: string, error?: any) {
  return console.error(
    `${colors.red}[MCP Host Server]${colors.reset} ${message}`,
    error ? error : ''
  )
}
