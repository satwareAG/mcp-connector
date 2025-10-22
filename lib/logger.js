import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Professional Winston logger with multi-transport support
 * Pattern adapted from satware IMAP MCP implementation
 */
export default class Logger {
  /**
   * Singleton instance getter
   * @param {Object} config - Logger configuration
   * @returns {Logger} Logger instance
   */
  static getInstance(config = {}) {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Constructor for Logger
   * @param {Object} config - Configuration object
   * @param {string} config.context - Context name for the logger (default: 'MCP-CONNECTOR')
   * @param {boolean} config.debug - Enable debug mode (default: from NODE_ENV)
   * @param {string} config.logDir - Directory for log files (default: './logs')
   */
  constructor(config = {}) {
    this.context = config.context || 'MCP-CONNECTOR';
    this.debug = config.debug !== undefined ? config.debug : process.env.NODE_ENV !== 'production';
    this.logDir = config.logDir || './logs';
    this.logger = this.createLogger();
  }

  /**
   * Creates Winston logger with console and file transports
   * @returns {winston.Logger} Configured Winston logger
   */
  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
        const ctx = context || this.context;
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${ctx}] ${level}: ${message} ${metaStr}`;
      })
    );

    const transports = [
      // Console transport with colors
      new winston.transports.Console({
        format: consoleFormat,
        level: this.debug ? 'debug' : 'info',
      }),

      // Error log file with daily rotation
      new DailyRotateFile({
        filename: `${this.logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxFiles: '30d',
        maxSize: '20m',
      }),

      // Combined log file with daily rotation
      new DailyRotateFile({
        filename: `${this.logDir}/combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        format: logFormat,
        maxFiles: '30d',
        maxSize: '20m',
      }),
    ];

    return winston.createLogger({
      level: this.debug ? 'debug' : 'info',
      format: logFormat,
      transports,
      exitOnError: false,
    });
  }

  /**
   * Create a child logger with additional context
   * @param {string|Object} context - Context name or object
   * @returns {Object} Child logger proxy
   */
  child(context) {
    const childContext = typeof context === 'string' ? context : JSON.stringify(context);
    const childLogger = this.logger.child({ context: childContext });

    return {
      error: (message, meta = {}) => childLogger.error(message, meta),
      warn: (message, meta = {}) => childLogger.warn(message, meta),
      info: (message, meta = {}) => childLogger.info(message, meta),
      http: (message, meta = {}) => childLogger.http(message, meta),
      verbose: (message, meta = {}) => childLogger.verbose(message, meta),
      debug: (message, meta = {}) => childLogger.debug(message, meta),
      silly: (message, meta = {}) => childLogger.silly(message, meta),
    };
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    this.logger.error(message, { context: this.context, ...meta });
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.logger.info(message, { context: this.context, ...meta });
  }

  /**
   * Log HTTP message
   * @param {string} message - HTTP message
   * @param {Object} meta - Additional metadata
   */
  http(message, meta = {}) {
    this.logger.http(message, { context: this.context, ...meta });
  }

  /**
   * Log verbose message
   * @param {string} message - Verbose message
   * @param {Object} meta - Additional metadata
   */
  verbose(message, meta = {}) {
    this.logger.verbose(message, { context: this.context, ...meta });
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  /**
   * Log silly message
   * @param {string} message - Silly message
   * @param {Object} meta - Additional metadata
   */
  silly(message, meta = {}) {
    this.logger.silly(message, { context: this.context, ...meta });
  }
}

// Create and export default logger instance
const defaultLogger = new Logger({
  context: 'MCP-CONNECTOR',
  debug: process.env.NODE_ENV !== 'production',
});

export { defaultLogger };
