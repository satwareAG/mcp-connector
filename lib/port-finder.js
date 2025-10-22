import net from 'net';
import { PORTS } from './constants.js';

/**
 * Checks if a port is available for use
 * @param {number} port - The port number to check
 * @returns {Promise<boolean>} True if port is available, false otherwise
 */
export function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      // Handle cases where err might be undefined (e.g., in tests)
      if (err && err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Finds an available port within a range
 * @param {number} startPort - Starting port number (default: PORTS.MCP_DEFAULT_START)
 * @param {number} endPort - Ending port number (default: PORTS.MCP_DEFAULT_END)
 * @returns {Promise<number>} Available port number
 * @throws {Error} If no available port is found in the range
 */
export async function findAvailablePort(
  startPort = PORTS.MCP_DEFAULT_START,
  endPort = PORTS.MCP_DEFAULT_END
) {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${endPort}`);
}
