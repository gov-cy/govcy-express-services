export function requestLogger(req, res, next) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
  
    if (req.session) {
      console.log(`Session ID: ${req.sessionID}`);
    }
  
    next(); // Pass control to the next middleware
  }
  