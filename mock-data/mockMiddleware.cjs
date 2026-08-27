// Custom json-server middleware exposing fixed-status routes so the axios
// error taxonomy (4xx/5xx branches in src/lib/http.ts) can be exercised
// against a real HTTP response instead of a hand-rolled one.
// A plain CommonJS file loaded by json-server's own --middlewares flag via
// Node's require(), not bundled by Vite — ESM import isn't an option here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('./db.json')

// In-memory only, on purpose — this only needs to outlive one browser
// session's OTP flow, not survive a mock-server restart the way db.json's
// own persisted data does. A single global session (not keyed per user)
// matches this mock backend's existing no-real-auth scope.
let otpSession = null

function startOtpSession() {
  otpSession = { expiresAt: Date.now() + db.otp.expirySeconds * 1000 }
  return otpSession
}

module.exports = (req, res, next) => {
  if (req.path === '/__mock/validation-error') {
    return res.status(422).json({
      message: 'Doğrulama hatası',
      fieldErrors: { name: 'Geçersiz belge adı' },
    })
  }

  if (req.path === '/__mock/server-error') {
    return res.status(500).json({ message: 'Sunucu hatası' })
  }

  // Real server-side expiry: the client's own countdown is cosmetic only.
  // A code isn't rejected/accepted because the client's timer says so — a
  // fresh session's expiresAt is the one thing verify() below checks against.
  if (req.path === '/__mock/otp/request' && req.method === 'POST') {
    const session = startOtpSession()
    return res.status(200).json({ expiresAt: session.expiresAt })
  }

  if (req.path === '/__mock/otp/verify' && req.method === 'POST') {
    if (!otpSession || Date.now() > otpSession.expiresAt) {
      return res.status(410).json({ error: 'otp_expired' })
    }
    if (req.body?.code !== db.otp.correctCode) {
      return res.status(401).json({ error: 'otp_invalid' })
    }
    // Single-use — a captured/replayed correct code can't be verified twice.
    otpSession = null
    return res.status(200).json({ ok: true })
  }

  next()
}
