/**
 * Human-in-the-loop request utility
 * Migrated from Python: utils/hitl.py
 */

interface HITLData {
  question: string;
  responseWebSocketUrl: string;
  type: 'question' | 'permission' | 'choice';
  choices?: string[];
  timeout: number;
  requiresResponse: boolean;
}

interface HITLResponse {
  response?: string;
  permission?: boolean;
  choice?: string;
}

interface HITLOptions {
  question: string;
  type?: 'question' | 'permission' | 'choice';
  choices?: string[];
  timeout?: number;
  observabilityUrl?: string;
}

/**
 * Helper class for human-in-the-loop requests
 */
export class HITLRequest {
  private question: string;
  private type: 'question' | 'permission' | 'choice';
  private choices?: string[];
  private timeout: number;
  private observabilityUrl: string;
  private responsePort: number = 0;
  private responseData: HITLResponse | null = null;

  constructor(options: HITLOptions) {
    this.question = options.question;
    this.type = options.type || 'question';
    this.choices = options.choices;
    this.timeout = options.timeout || 300;
    this.observabilityUrl = options.observabilityUrl || 'http://localhost:4000';
  }

  /**
   * Find an available port for WebSocket server
   */
  private async findFreePort(): Promise<number> {
    return new Promise((resolve) => {
      const server = Bun.serve({
        port: 0,
        fetch() {
          return new Response('');
        },
      });
      const port = server.port || 0;
      server.stop();
      resolve(port);
    });
  }

  /**
   * Get HITL data for inclusion in HookEvent
   */
  getHITLData(): HITLData {
    return {
      question: this.question,
      responseWebSocketUrl: `ws://localhost:${this.responsePort}`,
      type: this.type,
      choices: this.choices,
      timeout: this.timeout,
      requiresResponse: true,
    };
  }

  /**
   * Send HITL request and wait for response
   */
  async sendAndWait(
    hookEventData: Record<string, unknown>,
    sessionData: Record<string, unknown>
  ): Promise<HITLResponse | null> {
    // Find free port first
    this.responsePort = await this.findFreePort();

    const eventPayload = {
      ...sessionData,
      hook_event_type: hookEventData.hook_event_type || 'HumanInTheLoop',
      payload: hookEventData.payload || {},
      humanInTheLoop: this.getHITLData(),
      timestamp: Date.now(),
    };

    // Start WebSocket server
    const self = this;
    const server = Bun.serve({
      port: this.responsePort,
      fetch(req, server) {
        if (server.upgrade(req)) return;
        return new Response('Upgrade failed', { status: 500 });
      },
      websocket: {
        message(ws, message) {
          try {
            self.responseData = JSON.parse(String(message));
            ws.close();
          } catch (e) {
            console.error('Error parsing HITL response:', e);
          }
        },
        open() {},
        close() {},
      },
    });

    // Small delay for socket to bind
    await Bun.sleep(100);

    // Send to observability server
    try {
      const response = await fetch(`${this.observabilityUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (e) {
      console.error('Failed to send HITL request:', e);
      server.stop();
      return null;
    }

    // Wait for response with timeout
    const startTime = Date.now();
    while (!this.responseData && Date.now() - startTime < this.timeout * 1000) {
      await Bun.sleep(100);
    }

    server.stop();
    return this.responseData;
  }
}

// Convenience functions

/**
 * Ask a question and wait for text response
 */
export async function askQuestion(
  question: string,
  sessionData: Record<string, unknown>,
  timeout = 300
): Promise<string | null> {
  const hitl = new HITLRequest({ question, type: 'question', timeout });
  const response = await hitl.sendAndWait(
    { hook_event_type: 'HumanInTheLoop', payload: {} },
    sessionData
  );
  return response?.response || null;
}

/**
 * Ask for permission and wait for yes/no response
 */
export async function askPermission(
  question: string,
  sessionData: Record<string, unknown>,
  timeout = 300
): Promise<boolean> {
  const hitl = new HITLRequest({ question, type: 'permission', timeout });
  const response = await hitl.sendAndWait(
    { hook_event_type: 'HumanInTheLoop', payload: {} },
    sessionData
  );
  return response?.permission || false;
}

/**
 * Ask user to choose from options
 */
export async function askChoice(
  question: string,
  choices: string[],
  sessionData: Record<string, unknown>,
  timeout = 300
): Promise<string | null> {
  const hitl = new HITLRequest({ question, type: 'choice', choices, timeout });
  const response = await hitl.sendAndWait(
    { hook_event_type: 'HumanInTheLoop', payload: {} },
    sessionData
  );
  return response?.choice || null;
}
