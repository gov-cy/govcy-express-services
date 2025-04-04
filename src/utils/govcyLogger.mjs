/**
 * Logs a message to the console with a given level.
 * Falls back to console.log if an unknown level is used.
 * 
 * @param {'info'|'warn'|'error'|'debug'} level - The log level.
 * @param {...any} args - The content to log.
 */
export function logger(level, ...args) {
    const timestamp = new Date().toISOString();
  
    const logMethods = {
      info: console.log,
      warn: console.warn,
      error: console.error,
      debug: (...msg) => {
        if (process.env.DEBUG === 'true') {
          console.debug(...msg);
        }
      }
    };
  
    const logFn = logMethods[level] || console.log;
  
    logFn(`[${level.toUpperCase()}] [${timestamp}]`, ...args);
  }
// Attach shortcut functions to the main logger function
logger.info = (...args) => logger('info', ...args);
logger.warn = (...args) => logger('warn', ...args);
logger.error = (...args) => logger('error', ...args);
logger.debug = (...args) => logger('debug', ...args);