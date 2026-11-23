export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (
    err?.type === "entity.parse.failed" ||
    (err instanceof SyntaxError && err.status === 400)
  ) {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  const status =
    Number.isInteger(err?.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;

  if (status >= 500) {
    console.error(err);
  }

  return res.status(status).json({
    error: status >= 500 ? "Internal server error." : err.message
  });
}
