/**
 * Utility functions for authentication and authorization
 */

export function isAdmin(user: { role?: string | number | null } | null): boolean {
  if (!user || !user.role) return false;

  const role = String(user.role).toLowerCase().trim();

  // Check for various admin role representations
  return (
    role === 'admin' ||
    role === 'administrator' ||
    role === 'root' ||
    role === '1' || // numeric admin
    role === '0'    // some systems use 0 for admin
  );
}

export function requireAdmin(user: { role?: string | number | null } | null, redirectTo?: string): boolean {
  if (isAdmin(user)) {
    return true;
  }

  if (redirectTo && typeof window !== 'undefined') {
    window.location.href = redirectTo;
  }

  return false;
}