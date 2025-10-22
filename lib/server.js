import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { authMiddleware } from './auth.js';
import { findAvailablePort } from './port-finder.js';
import { defaultLogger } from './logger.js';
import { HTTP_STATUS, TIMEOUTS } from './constants.js';

const clients = new Map();

/**
 * Clears all clients. For testing purposes only.
 * @private
 */
export function __clearClientsForTesting() {
  clients.clear();
}

/**
 * Creates an MCP client with the specified transport configuration.
 * @param {string} id - Unique identifier for the client
 * @param {Object} config - Transport configuration
 * @returns {Promise<Object>} Client instance with metadata
 */
async function createClient(id, config) {
  let transport;

  switch (config.transport) {
    case 'stdio': {
      if (!config.command) {
        throw new Error('stdio transport requires command');
      }
      defaultLogger.info('Creating stdio transport', {
        command: config.command,
        args: config.args,
      });
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env,
      });
      break;
    }
    case 'sse': {
      if (!config.url) {
        throw new Error('SSE transport requires url');
      }
      defaultLogger.info('Creating SSE transport', { url: config.url });
      transport = new SSEClientTransport(new URL(config.url));
      break;
    }
    case 'websocket': {
      if (!config.url) {
        throw new Error('WebSocket transport requires url');
      }
      defaultLogger.info('Creating WebSocket transport', { url: config.url });
      transport = new WebSocketClientTransport(new URL(config.url));
      break;
    }
    default:
      throw new Error(`Unsupported transport type: ${config.transport}`);
  }

  const client = new Client(
    {
      name: `mcp-connector-${id}`,
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);

  const info = {
    client,
    transport,
    config,
    connectedAt: new Date().toISOString(),
  };

  clients.set(id, info);
  return info;
}

/**
 * Restarts an existing MCP client with its original configuration.
 * @param {string} id - Client identifier
 * @returns {Promise<Object>} New client instance
 */
async function restartClient(id) {
  const info = clients.get(id);
  if (!info) {
    throw new Error(`Client ${id} not found`);
  }

  const { config } = info;

  try {
    await info.client.close();
  } catch (error) {
    defaultLogger.error('Error closing client during restart', {
      id,
      error: error.message,
    });
  }

  clients.delete(id);

  return createClient(id, config);
}

/**
 * Creates and configures an Express server for the MCP connector.
 * @param {string} apiKey - Authentication key for the API
 * @returns {express.Application} Configured Express application
 */
export function createServer(apiKey) {
  const app = express();

  app.use(express.json());
  app.use(authMiddleware(apiKey));

  app.get('/ping', (req, res) => {
    res.status(HTTP_STATUS.OK).json({ status: 'ok' });
  });

  app.post('/start', async (req, res) => {
    try {
      const { id, config } = req.body;

      if (!id || !config) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing id or config' });
      }

      if (clients.has(id)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: `Client ${id} already exists` });
      }

      const info = await createClient(id, config);

      const toolsList = await info.client.listTools();

      res.status(HTTP_STATUS.CREATED).json({
        id,
        connectedAt: info.connectedAt,
        tools: toolsList.tools || [],
      });
    } catch (error) {
      defaultLogger.error('Error starting client', {
        error: error.message,
        stack: error.stack,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  });

  app.post('/restart/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!clients.has(id)) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: `Client ${id} not found` });
      }

      const info = await restartClient(id);

      const toolsList = await info.client.listTools();

      res.status(HTTP_STATUS.OK).json({
        id,
        connectedAt: info.connectedAt,
        tools: toolsList.tools || [],
      });
    } catch (error) {
      defaultLogger.error('Error restarting client', {
        id: req.params.id,
        error: error.message,
        stack: error.stack,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  });

  app.get('/clients', async (req, res) => {
    try {
      const clientList = [];
      for (const [id, info] of clients.entries()) {
        const toolsList = await info.client.listTools();
        clientList.push({
          id,
          connectedAt: info.connectedAt,
          transport: info.config.transport,
          tools: toolsList.tools || [],
        });
      }
      res.status(HTTP_STATUS.OK).json({ clients: clientList });
    } catch (error) {
      defaultLogger.error('Error listing clients', {
        error: error.message,
        stack: error.stack,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  });

  app.get('/clients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const info = clients.get(id);

      if (!info) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: `Client ${id} not found` });
      }

      const toolsList = await info.client.listTools();

      res.status(HTTP_STATUS.OK).json({
        id,
        connectedAt: info.connectedAt,
        transport: info.config.transport,
        tools: toolsList.tools || [],
      });
    } catch (error) {
      defaultLogger.error('Error getting client', {
        id: req.params.id,
        error: error.message,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  });

  app.get('/clients/:id/tools', async (req, res) => {
    try {
      const { id } = req.params;
      const info = clients.get(id);

      if (!info) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: `Client ${id} not found` });
      }

      const toolsList = await info.client.listTools();

      res.status(HTTP_STATUS.OK).json({
        tools: toolsList.tools || [],
      });
    } catch (error) {
      defaultLogger.error('Error listing tools', {
        id: req.params.id,
        error: error.message,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  });

  app.post('/clients/:id/call_tool', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, arguments: args } = req.body;

      if (!name) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing tool name' });
      }

      const info = clients.get(id);

      if (!info) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: `Client ${id} not found` });
      }

      const result = await info.client.callTool({
        name,
        arguments: args || {},
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      defaultLogger.error('Error calling tool', {
        id: req.params.id,
        tool: req.body.name,
        error: error.message,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  });

  app.delete('/clients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const info = clients.get(id);

      if (!info) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: `Client ${id} not found` });
      }

      await info.client.close();
      clients.delete(id);

      res.status(HTTP_STATUS.OK).json({ message: `Client ${id} stopped` });
    } catch (error) {
      defaultLogger.error('Error stopping client', {
        id: req.params.id,
        error: error.message,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  });

  return app;
}

/**
 * Starts the MCP connector server.
 * @param {Object} options - Server configuration options
 * @param {string} options.apiKey - Authentication key
 * @param {number} [options.port] - Port number (auto-detected if not provided)
 * @returns {Promise<Object>} Server instance and port information
 */
export async function startServer(options) {
  const { apiKey, port: requestedPort } = options;

  if (!apiKey) {
    throw new Error('API key is required');
  }

  const port = requestedPort || (await findAvailablePort());

  const app = createServer(apiKey);

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      defaultLogger.info('MCP Connector server started', { port });
      resolve({ server, port, app });
    });

    server.on('error', (error) => {
      defaultLogger.error('Server error', {
        error: error.message,
        code: error.code,
      });
      reject(error);
    });

    const gracefulShutdown = async (signal) => {
      defaultLogger.info('Graceful shutdown initiated', { signal });

      server.close(async () => {
        defaultLogger.info('HTTP server closed');

        for (const [id, info] of clients.entries()) {
          try {
            await info.client.close();
            defaultLogger.info('Client closed', { id });
          } catch (error) {
            defaultLogger.error('Error closing client during shutdown', {
              id,
              error: error.message,
            });
          }
        }

        clients.clear();
        defaultLogger.info('Shutdown complete');
        process.exit(0);
      });

      setTimeout(() => {
        defaultLogger.error('Forced shutdown after timeout');
        process.exit(1);
      }, TIMEOUTS.SERVER_STARTUP);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  });
}
