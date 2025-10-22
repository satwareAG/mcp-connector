import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create mock functions that we can control
let mockCreateServer;
let mockServers; // Array of mock servers
let mockServerIndex; // Index for sequential server creation

// Mock the net module BEFORE importing port-finder
jest.unstable_mockModule('net', () => ({
  default: {
    createServer: (...args) => mockCreateServer(...args),
  },
}));

// Import the mocked net module and port-finder

const _net = await import('net');
const { findAvailablePort } = await import('../../lib/port-finder.js');

describe('port-finder', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Pre-create mock servers that tests can configure
    // Each createServer call will return the next server in the array

    mockServers = [
      {
        listen: jest.fn(),
        close: jest.fn(),
        once: jest.fn(),
      },
      {
        listen: jest.fn(),
        close: jest.fn(),
        once: jest.fn(),
      },
    ];
    mockServerIndex = 0;

    // Create mock createServer function that returns servers sequentially
    mockCreateServer = jest.fn(() => {
      const server = mockServers[mockServerIndex];
      mockServerIndex++;
      return server;
    });
  });

  describe('findAvailablePort - first port available', () => {
    it('should return 50880 when first port is available', async () => {
      // Setup: First port is available (listening event fires)
      mockServers[0].once.mockImplementation((event, callback) => {
        if (event === 'listening') {
          // Immediately invoke the listening callback
          setImmediate(callback);
        }
      });

      const port = await findAvailablePort();

      expect(port).toBe(50880);
      expect(mockCreateServer).toHaveBeenCalledTimes(1);
      expect(mockServers[0].listen).toHaveBeenCalledWith(50880);
      expect(mockServers[0].close).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAvailablePort - second port available', () => {
    it('should return 50881 when first port is busy but second is available', async () => {
      // Setup: First port busy (error event), second port available (listening event)
      mockServers[0].once.mockImplementation((event, callback) => {
        if (event === 'error') {
          // First port: fire error event (port busy)
          setImmediate(callback);
        }
      });

      mockServers[1].once.mockImplementation((event, callback) => {
        if (event === 'listening') {
          // Second port: fire listening event (port available)
          setImmediate(callback);
        }
      });

      const port = await findAvailablePort();

      expect(port).toBe(50881);
      expect(mockCreateServer).toHaveBeenCalledTimes(2);
      expect(mockServers[0].listen).toHaveBeenCalledWith(50880);
      expect(mockServers[1].listen).toHaveBeenCalledWith(50881);
      expect(mockServers[1].close).toHaveBeenCalledTimes(1); // Only closed for successful port
    });
  });

  describe('findAvailablePort - no ports available', () => {
    it('should return null when both ports are busy', async () => {
      // Setup: Both ports busy (error events fire)
      mockServers[0].once.mockImplementation((event, callback) => {
        if (event === 'error') {
          setImmediate(callback);
        }
      });

      mockServers[1].once.mockImplementation((event, callback) => {
        if (event === 'error') {
          setImmediate(callback);
        }
      });

      const port = await findAvailablePort();

      expect(port).toBeNull();
      expect(mockCreateServer).toHaveBeenCalledTimes(2);
      expect(mockServers[0].listen).toHaveBeenCalledWith(50880);
      expect(mockServers[1].listen).toHaveBeenCalledWith(50881);
      expect(mockServers[0].close).not.toHaveBeenCalled(); // No successful port to close
      expect(mockServers[1].close).not.toHaveBeenCalled();
    });
  });

  describe('findAvailablePort - event ordering', () => {
    it('should handle error event registered before listening event', async () => {
      const events = {};

      // Capture event handlers
      mockServers[0].once.mockImplementation((event, callback) => {
        events[event] = callback;
      });

      // Start the port check
      const portPromise = findAvailablePort();

      // Wait for event handlers to be registered
      await new Promise((resolve) => setImmediate(resolve));

      // Verify both event handlers were registered
      expect(events.error).toBeDefined();
      expect(events.listening).toBeDefined();

      // Fire listening event to indicate port is available
      events.listening();

      const port = await portPromise;
      expect(port).toBe(50880);
    });

    it('should handle listening event registered before error event', async () => {
      const events = {};

      mockServers[0].once.mockImplementation((event, callback) => {
        events[event] = callback;
      });

      mockServers[1].once.mockImplementation((event, callback) => {
        if (event === 'listening') {
          // Second port: immediately fire listening
          setImmediate(callback);
        }
      });

      const portPromise = findAvailablePort();
      await new Promise((resolve) => setImmediate(resolve));

      // Fire error event to indicate first port is busy
      events.error();

      const port = await portPromise;
      expect(port).toBe(50881); // Should try second port
    });
  });

  describe('findAvailablePort - server close behavior', () => {
    it('should close server after successful listen', async () => {
      mockServers[0].once.mockImplementation((event, callback) => {
        if (event === 'listening') {
          setImmediate(callback);
        }
      });

      await findAvailablePort();

      // Verify close was called
      expect(mockServers[0].close).toHaveBeenCalledTimes(1);
      expect(mockServers[0].close).toHaveBeenCalledWith();
    });

    it('should not close server when listen fails', async () => {
      mockServers[0].once.mockImplementation((event, callback) => {
        if (event === 'error') {
          setImmediate(callback);
        }
      });

      mockServers[1].once.mockImplementation((event, callback) => {
        if (event === 'error') {
          setImmediate(callback);
        }
      });

      await findAvailablePort();

      // Server should not be closed when listen fails
      expect(mockServers[0].close).not.toHaveBeenCalled();
      expect(mockServers[1].close).not.toHaveBeenCalled();
    });
  });

  describe('findAvailablePort - port order', () => {
    it('should check ports in order [50880, 50881]', async () => {
      const listenCalls = [];

      mockServers[0].listen.mockImplementation((port) => {
        listenCalls.push(port);
      });

      mockServers[1].listen.mockImplementation((port) => {
        listenCalls.push(port);
      });

      mockServers[0].once.mockImplementation((event, callback) => {
        if (event === 'error') {
          setImmediate(callback);
        }
      });

      mockServers[1].once.mockImplementation((event, callback) => {
        if (event === 'error') {
          setImmediate(callback);
        }
      });

      await findAvailablePort();

      expect(listenCalls).toEqual([50880, 50881]);
    });

    it('should not check second port if first is available', async () => {
      mockServers[0].once.mockImplementation((event, callback) => {
        if (event === 'listening') {
          setImmediate(callback);
        }
      });

      await findAvailablePort();

      expect(mockServers[0].listen).toHaveBeenCalledTimes(1);
      expect(mockServers[0].listen).toHaveBeenCalledWith(50880);
      expect(mockServers[1].listen).not.toHaveBeenCalled();
    });
  });

  describe('findAvailablePort - async behavior', () => {
    it('should handle asynchronous port checks correctly', async () => {
      let resolveListening;
      const listeningPromise = new Promise((resolve) => {
        resolveListening = resolve;
      });

      mockServers[0].once.mockImplementation((event, callback) => {
        if (event === 'listening') {
          // Simulate async behavior - don't call immediately
          listeningPromise.then(callback);
        }
      });

      const portPromise = findAvailablePort();

      // Port should not be available yet
      const raceResult = await Promise.race([
        portPromise,
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 50)),
      ]);
      expect(raceResult).toBe('timeout');

      // Now trigger the listening event
      resolveListening();

      const port = await portPromise;
      expect(port).toBe(50880);
    });
  });

  describe('findAvailablePort - createServer invocation', () => {
    it('should create a new server instance for each port check', async () => {
      mockServers[0].once.mockImplementation((event, callback) => {
        if (event === 'error') {
          setImmediate(callback);
        }
      });

      mockServers[1].once.mockImplementation((event, callback) => {
        if (event === 'error') {
          setImmediate(callback);
        }
      });

      await findAvailablePort();

      // Should create server for each port attempt
      expect(mockCreateServer).toHaveBeenCalledTimes(2);
    });

    it('should call createServer with no arguments', async () => {
      mockServers[0].once.mockImplementation((event, callback) => {
        if (event === 'listening') {
          setImmediate(callback);
        }
      });

      await findAvailablePort();

      expect(mockCreateServer).toHaveBeenCalledWith();
    });
  });
});
