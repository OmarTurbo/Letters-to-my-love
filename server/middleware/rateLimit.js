export function createRateLimiter({ windowMs = 60_000, max = 5 } = {}) {
  const attempts = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const recent = (attempts.get(key) || []).filter((time) => now - time < windowMs);

    if (attempts.size > 10_000) {
      for (const [storedKey, times] of attempts) {
        if (!times.length) attempts.delete(storedKey);
      }
    }

    if (recent.length >= max) {
      return res.status(429).json({ error: 'Too many replies. Please try again later.' });
    }

    recent.push(now);
    attempts.set(key, recent);
    return next();
  };
}
