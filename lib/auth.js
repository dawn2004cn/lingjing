import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'lingjing-secret-key-change-in-production'

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export function getAuthUser() {
  try {
    const store = cookies()
    const token = store.get('token')?.value
    if (!token) return null
    return verifyToken(token)
  } catch {
    return null
  }
}

export function setTokenCookie(token) {
  // Return the cookie header; caller must set it
  return `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
}

export function clearTokenCookie() {
  return `token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}