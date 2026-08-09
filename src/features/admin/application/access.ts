export type AdminAccessConfig = { username: string; password: string };

export const readAdminAccessConfig = (): AdminAccessConfig | null => {
  const username = process.env.MJTV_ADMIN_USERNAME?.trim().normalize("NFC");
  const password = process.env.MJTV_ADMIN_PASSWORD?.normalize("NFC");
  return username && !username.includes(":") && password && password.length >= 16
    ? { username, password }
    : null;
};

const decodeBasicCredentials = (value: string): string =>
  new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(value), (byte) => byte.charCodeAt(0)),
  );

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
  const match = authorization?.match(/^Basic ([A-Za-z\d+/]+={0,2})$/i);
  if (!match) return false;
  try {
    const decoded = decodeBasicCredentials(match[1]!);
    const separator = decoded.indexOf(":");
    if (separator < 1) return false;
    return (
      constantTimeEqual(decoded.slice(0, separator).normalize("NFC"), config.username) &&
      constantTimeEqual(decoded.slice(separator + 1).normalize("NFC"), config.password)
    );
  } catch {
    return false;
  }
};
