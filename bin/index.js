#!/usr/bin/env node

import { start } from '../lib/server.js';
import { defaultLogger } from '../lib/logger.js';
import chalk from 'chalk';

// Get auth token from command line arguments or environment variable
const authToken = process.argv[2] || process.env.MCP_AUTH_TOKEN;

if (!authToken) {
  defaultLogger.error(chalk.red('Error: Authentication token is required'));
  defaultLogger.info('Usage: npx @typingmind/mcp <auth-token>');
  defaultLogger.info('       OR set MCP_AUTH_TOKEN environment variable');
  process.exit(1);
}

// Start the server with the provided auth token
start(authToken)
  .then(({ host, port, protocol }) => {
    defaultLogger.info(chalk.green(`✓ MCP runner server running on ${protocol}://${host}:${port}`));
    defaultLogger.info(
      chalk.yellow(
        'Note: You must keep the server running in the background in order to use MCP in TypingMind.'
      )
    );
  })
  .catch((err) => {
    defaultLogger.error(chalk.red(`Error starting MCP server: ${err.message}`));
    process.exit(1);
  });
