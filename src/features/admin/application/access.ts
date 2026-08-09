export type AdminAccessConfig = { username: string; password: string };

export const readAdminAccessConfig = (): AdminAccessConfig | null => {
  const username = process.env.MJTV_ADMIN_USERNAME?.trim();
  const password = process.env.MJTV_ADMIN_PASSWORD;
  return username && !username.includes(":") && password && password.length >= 16
    ? { username, password }
    : null;
};

const constantTimeEqual = (left: string, right: string): boolean => {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
};

export const isValidAdminAuthorization = (
  authorization: string | null,
  config: AdminAccessConfig,
): boolean => {
  if (!authorization?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 1) return false;
    return (
      constantTimeEqual(decoded.slice(0, separator), config.username) &&
      constantTimeEqual(decoded.slice(separator + 1), config.password)
    );
  } catch {
    return false;
  }
};
