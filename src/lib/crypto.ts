
/**
 * Hashes a PIN using SHA-256.
 * @param pin The 4-6 digit PIN to hash.
 * @returns The hex string of the hash.
 */
/**
 * Hashes a PIN using SHA-256 with a unique salt (User UID).
 * @param pin The 4-6 digit PIN to hash.
 * @param salt The unique salt (e.g., user UID) to prevent rainbow table attacks.
 * @returns The hex string of the hash.
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    // Use salt prefix to ensure unique hash per user even for same PIN
    const data = encoder.encode(salt + "::" + pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Verifies a PIN against a hash.
 * @param pin The input PIN.
 * @param hash The stored hash.
 * @param salt The salt used during hashing.
 * @returns True if the PIN matches the hash.
 */
export async function verifyPinHash(pin: string, hash: string, salt: string): Promise<boolean> {
    const computedHash = await hashPin(pin, salt);
    return computedHash === hash;
}
