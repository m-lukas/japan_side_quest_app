export function roleForToken(token) {
  if (token && token === process.env.DANIEL_TOKEN) return 'daniel';
  if (token && token === process.env.ADMIN_TOKEN) return 'admin';
  return null;
}

export function validToken(token) {
  return roleForToken(token) !== null;
}
