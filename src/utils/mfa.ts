/**
 * Lightweight deterministic pseudo-TOTP MFA utility.
 * Generates and validates 6-digit passcodes that update every 30 seconds
 * based on a secret key.
 */

export function generateTOTPCode(secret: string, step = 30): string {
  if (!secret) return "000000";
  
  // Calculate current epoch slot (changes every 30s)
  const epoch = Math.floor(Date.now() / 1000 / step);
  
  // Create a repeatable polynomial hash from secret + epoc
  let hash = 0;
  const combinedStr = `${secret}_fmc_totp_${epoch}`;
  
  for (let i = 0; i < combinedStr.length; i++) {
    hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
    hash |= 0; // Convert to 32-bit signed integer
  }
  
  // Translate hash to absolute 6-digit value padded with zeros
  const rawCode = Math.abs(hash) % 1000000;
  return rawCode.toString().padStart(6, '0');
}

/**
 * Validates a user-provided MFA code against the current expected code (and the previous/next interval to prevent timing issues).
 */
export function verifyTOTPCode(inputCode: string, secret: string): boolean {
  if (!secret || !inputCode) return false;
  
  const cleanInput = inputCode.trim();
  const currentEpoch = Math.floor(Date.now() / 1000 / 30);
  const getCodeForEpoch = (e: number) => {
    let hash = 0;
    const combinedStr = `${secret}_fmc_totp_${e}`;
    for (let i = 0; i < combinedStr.length; i++) {
      hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 1000000).toString().padStart(6, '0');
  };
  
  return (
    cleanInput === getCodeForEpoch(currentEpoch) ||
    cleanInput === getCodeForEpoch(currentEpoch - 1) ||
    cleanInput === getCodeForEpoch(currentEpoch + 1)
  );
}

/**
 * Generates a random alphanumeric secret key for user enrollment.
 */
export function generateRandomSecret(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // Base32 alphabet
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
