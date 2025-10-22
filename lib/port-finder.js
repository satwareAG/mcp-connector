import net from 'net';

const PORTS = [50880, 50881];

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function findAvailablePort() {
  for (const port of PORTS) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return null;
}

export { findAvailablePort };
