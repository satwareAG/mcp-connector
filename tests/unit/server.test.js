import { jest } from '@jest/globals';

// Mock dependencies before importing server
const mockConnect = jest.fn();
const mockClose = jest.fn();
const mockListTools = jest.fn();
const mockCallTool = jest.fn();

const mockStdioTransport = jest.fn();
const mockSSETransport = jest.fn();
const mockWebSocketTransport = jest.fn();

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class MockClient {
    constructor() {
      this.connect = mockConnect;
      this.close = mockClose;
      this.listTools = mockListTools;
      this.callTool = mockCallTool;
    }
  },
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: mockStdioTransport,
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: mockSSETransport,
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/websocket.js', () => ({
  WebSocketClientTransport: mockWebSocketTransport,
}));

jest.unstable_mockModule('../../lib/auth.js', () => ({
  authMiddleware: (_apiKey) => (req, res, next) => next(),
}));

const mockFindAvailablePort = jest.fn();
jest.unstable_mockModule('../../lib/port-finder.js', () => ({
  findAvailablePort: mockFindAvailablePort,
}));

// Import server after mocks are set up
const { createServer, startServer, __clearClientsForTesting } = await import('../../lib/server.js');

describe('server', () => {
  let app;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    __clearClientsForTesting();
    mockConnect.mockResolvedValue(undefined);
    mockListTools.mockResolvedValue({ tools: [] });
    mockClose.mockResolvedValue(undefined);
    mockFindAvailablePort.mockResolvedValue(3000);

    app = createServer('test-api-key');

    mockReq = {
      body: {},
      params: {},
      headers: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('createServer', () => {
    it('should create Express app', () => {
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });
  });

  describe('GET /ping', () => {
    it('should return 200 with status ok', async () => {
      const route = app._router.stack
        .find((layer) => layer.route?.path === '/ping')
        ?.route.stack.find((layer) => layer.method === 'get').handle;

      await route(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok' });
    });
  });

  describe('POST /start', () => {
    it('should create new client and return tools', async () => {
      mockReq.body = {
        id: 'test-client',
        config: {
          transport: 'stdio',
          command: 'test-command',
          args: ['arg1'],
        },
      };

      mockListTools.mockResolvedValue({
        tools: [{ name: 'test-tool' }],
      });

      const route = app._router.stack
        .find((layer) => layer.route?.path === '/start')
        ?.route.stack.find((layer) => layer.method === 'post').handle;

      await route(mockReq, mockRes);

      expect(mockStdioTransport).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-client',
          tools: [{ name: 'test-tool' }],
        })
      );
    });

    it('should return 400 when id or config is missing', async () => {
      mockReq.body = { id: 'test' };

      const route = app._router.stack
        .find((layer) => layer.route?.path === '/start')
        ?.route.stack.find((layer) => layer.method === 'post').handle;

      await route(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing id or config',
      });
    });
  });

  describe('POST /restart/:id', () => {
    beforeEach(async () => {
      mockReq.body = {
        id: 'client1',
        config: { transport: 'stdio', command: 'test' },
      };

      const startRoute = app._router.stack
        .find((layer) => layer.route?.path === '/start')
        ?.route.stack.find((layer) => layer.method === 'post').handle;

      await startRoute(mockReq, mockRes);
      jest.clearAllMocks();
    });

    it('should restart existing client', async () => {
      mockReq.params = { id: 'client1' };
      mockListTools.mockResolvedValue({ tools: [] });

      const route = app._router.stack
        .find((layer) => layer.route?.path === '/restart/:id')
        ?.route.stack.find((layer) => layer.method === 'post').handle;

      await route(mockReq, mockRes);

      expect(mockClose).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when client not found', async () => {
      mockReq.params = { id: 'nonexistent' };

      const route = app._router.stack
        .find((layer) => layer.route?.path === '/restart/:id')
        ?.route.stack.find((layer) => layer.method === 'post').handle;

      await route(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Client nonexistent not found',
      });
    });
  });

  describe('GET /clients', () => {
    it('should return empty list when no clients', async () => {
      const route = app._router.stack
        .find((layer) => layer.route?.path === '/clients')
        ?.route.stack.find((layer) => layer.method === 'get').handle;

      await route(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ clients: [] });
    });
  });

  describe('GET /clients/:id', () => {
    it('should return 404 when client not found', async () => {
      mockReq.params = { id: 'nonexistent' };

      const route = app._router.stack
        .find((layer) => layer.route?.path === '/clients/:id')
        ?.route.stack.find((layer) => layer.method === 'get').handle;

      await route(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('GET /clients/:id/tools', () => {
    it('should return 404 when client not found', async () => {
      mockReq.params = { id: 'nonexistent' };

      const route = app._router.stack
        .find((layer) => layer.route?.path === '/clients/:id/tools')
        ?.route.stack.find((layer) => layer.method === 'get').handle;

      await route(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('POST /clients/:id/call_tool', () => {
    it('should return 400 when tool name is missing', async () => {
      mockReq.params = { id: 'client1' };
      mockReq.body = { arguments: {} };

      const route = app._router.stack
        .find((layer) => layer.route?.path === '/clients/:id/call_tool')
        ?.route.stack.find((layer) => layer.method === 'post').handle;

      await route(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing tool name',
      });
    });

    it('should return 404 when client not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { name: 'test-tool' };

      const route = app._router.stack
        .find((layer) => layer.route?.path === '/clients/:id/call_tool')
        ?.route.stack.find((layer) => layer.method === 'post').handle;

      await route(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /clients/:id', () => {
    it('should return 404 when client not found', async () => {
      mockReq.params = { id: 'nonexistent' };

      // Find DELETE route (multiple routes can have same path with different methods)
      const deleteRoute = app._router.stack
        .filter((layer) => layer.route?.path === '/clients/:id')
        .find((layer) => layer.route.stack.some((h) => h.method === 'delete'));

      const deleteHandler = deleteRoute?.route.stack.find((layer) => layer.method === 'delete');

      await deleteHandler.handle(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Client nonexistent not found',
      });
    });

    it('should stop client and return success', async () => {
      // Create a mock client first
      mockReq.body = {
        id: 'test-client',
        config: { transport: 'stdio', command: 'test' },
      };

      const startRoute = app._router.stack
        .find((layer) => layer.route?.path === '/start')
        ?.route.stack.find((layer) => layer.method === 'post').handle;

      await startRoute(mockReq, mockRes);
      jest.clearAllMocks();

      // Now delete it
      mockReq.params = { id: 'test-client' };

      const deleteRoute = app._router.stack
        .filter((layer) => layer.route?.path === '/clients/:id')
        .find((layer) => layer.route.stack.some((h) => h.method === 'delete'));

      const deleteHandler = deleteRoute?.route.stack.find((layer) => layer.method === 'delete');

      await deleteHandler.handle(mockReq, mockRes);

      expect(mockClose).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Client test-client stopped',
      });
    });
  });

  describe('startServer', () => {
    it('should throw error when API key is missing', async () => {
      await expect(startServer({})).rejects.toThrow('API key is required');
    });

    it('should use findAvailablePort when port not specified', async () => {
      // Use a random high port to avoid conflicts
      const randomPort = 50000 + Math.floor(Math.random() * 10000);
      mockFindAvailablePort.mockResolvedValue(randomPort);

      let server;
      try {
        const result = await startServer({ apiKey: 'test-key' });
        ({ server } = result);

        expect(mockFindAvailablePort).toHaveBeenCalled();
        expect(result.port).toBe(randomPort);
        expect(result.server).toBeDefined();
        expect(result.app).toBeDefined();
      } finally {
        // Always close server to free port
        if (server) {
          await new Promise((resolve) => server.close(resolve));
        }
      }
    });
  });
});
