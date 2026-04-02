/**
 * Centralised HTTP error factory.
 * Usage: throw createError(404, 'User not found')
 */
const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

module.exports = { createError };
