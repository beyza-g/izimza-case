// Custom json-server middleware exposing fixed-status routes so the axios
// error taxonomy (4xx/5xx branches in src/lib/http.ts) can be exercised
// against a real HTTP response instead of a hand-rolled one.
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

  next()
}
