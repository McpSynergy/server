# AGUI Protocol Documentation

## Overview

AGUI Protocol is a real-time communication protocol based on Server-Sent Events (SSE) designed for AI assistant interactions. It enables streaming responses, tool invocations, and event notifications in a structured manner.

## Protocol Features

- Real-time SSE-based communication
- Streaming text responses
- Tool invocation and result handling
- Event notification system
- Error handling and status feedback

## Message Flow

### 1. Connection Initialization

```typescript
// Headers setup
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type
```

### 2. Input Structure

```typescript
interface RunAgentInput {
  threadId: string; // Unique thread identifier
  runId: string; // Run identifier
  messages: Message[]; // Conversation messages
  state: any; // Current state
  tools: any; // Available tools
  context: any; // Context information
  forwardedProps: any; // Forwarded properties
}
```

### 3. Event Types

#### System Events

- `RunStarted`: Indicates the start of processing
- `RunCompleted`: Indicates completion of processing
- `RunError`: Indicates an error occurred

#### Loading Events

- `intention_loading`
- `search_knowledge_loading`
- `rerank_loading`
- `qa_loading`

#### Tool Events

- `ToolCallStart`: Tool execution begins
- `ToolCallEnd`: Tool execution completes
- `ToolCallArgs`: Tool arguments

### 4. Tool Call Structure

```typescript
interface ToolCallContent {
  tool_calls: Array<{
    id: string;
    type: string;
    index: number;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}
```

### 5. Response Handling

#### Text Response

```json
{
  "type": "text",
  "content": "Response content"
}
```

#### Tool Response

```json
{
  "type": "tool_call",
  "content": {
    "name": "tool_name",
    "result": "tool_result"
  }
}
```

### 6. Error Response Structure

```typescript
interface ErrorResponse {
  code: number;
  data: {
    content: string;
    meta: [
      {
        serverName: string;
        toolName: string;
        componentProps: object;
        aiOutput: string;
        isComplete: boolean;
      },
    ];
  };
  message: string;
  error: string;
}
```

## Implementation Guidelines

### 1. Server Implementation

- Initialize SSE connection
- Handle streaming responses
- Process tool calls
- Manage event emissions
- Handle errors gracefully

### 2. Client Implementation

- Establish SSE connection
- Listen for different event types
- Handle streaming text
- Process tool calls
- Manage UI updates

### 3. Tool Integration

```typescript
// Tool registration format
{
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  }
}
```

### 4. Event Handling

```typescript
// Event service usage
eventService.sendRunStarted();
eventService.sendTextMessage(content);
eventService.sendToolCallStart(toolName, args, id);
eventService.sendToolCallEnd(toolName, result, id);
eventService.sendCustomEvent(eventName, value);
```

## Best Practices

1. **Error Handling**

   - Implement comprehensive error catching
   - Provide meaningful error messages
   - Maintain connection stability

2. **Performance**

   - Optimize streaming chunks
   - Handle large responses efficiently
   - Implement proper cleanup

3. **Security**

   - Validate all inputs
   - Sanitize tool arguments
   - Implement proper authentication

4. **Reliability**
   - Implement reconnection logic
   - Handle timeout scenarios
   - Maintain message order

## Common Patterns

### 1. Tool Call Processing

```typescript
// Tool call handling pattern
if (content.delta?.tool_calls) {
  // Collect tool call content
  // Process tool arguments
  // Execute tool
  // Handle results
}
```

### 2. Streaming Response

```typescript
// Streaming response pattern
for await (const chunk of stream) {
  if (chunk.choices[0].delta?.content) {
    eventService.sendTextMessage(content);
  }
}
```

### 3. Error Handling

```typescript
try {
  // Process request
} catch (error) {
  eventService.sendRunError(error);
  // Clean up and end connection
}
```

## Debugging Tips

1. Enable detailed logging for tool calls
2. Monitor SSE connection status
3. Validate event sequence
4. Check tool response formats
5. Verify error handling paths

## Version History

### v1.0.0

- Initial protocol implementation
- Basic SSE support
- Tool call handling
- Event system

## Future Considerations

1. Enhanced error recovery
2. Better streaming performance
3. Extended tool capabilities
4. Improved type safety
5. Advanced monitoring

## References

- [Server-Sent Events MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
