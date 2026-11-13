import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEY_LENGTH = 64

export function legacySimpleHash(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return 'hash_' + Math.abs(hash).toString(16)
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  })

  return [
    'scrypt',
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$')
}

function verifyScryptPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const n = Number.parseInt(parts[1], 10)
  const r = Number.parseInt(parts[2], 10)
  const p = Number.parseInt(parts[3], 10)
  const saltPart = parts[4]
  const digestPart = parts[5]

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || !saltPart || !digestPart) {
    return false
  }

  try {
    const salt = Buffer.from(saltPart, 'base64url')
    const expected = Buffer.from(digestPart, 'base64url')

    const actual = scryptSync(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    })

    if (actual.length !== expected.length) return false
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false

  if (storedHash.startsWith('scrypt$')) {
    return verifyScryptPassword(password, storedHash)
  }

  if (storedHash.startsWith('hash_')) {
    return legacySimpleHash(password) === storedHash
  }

  // Compatibilidade temporária para registros legados em texto puro.
  return storedHash === password
}

export function needsPasswordRehash(storedHash: string | null | undefined): boolean {
  if (!storedHash) return true
  return !storedHash.startsWith('scrypt$')
}