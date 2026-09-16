import { normalizeTelemetry, TELEMETRY_REQUIRED } from '../api/contracts.js'
export { normalizeTelemetry } from '../api/contracts.js'

// RFC 4180 quote grammar; UTF-8 and LF records are accepted for common exports.
// Quotes can only open at the beginning of a field. Doubled quotes are escapes,
// not nested quoting. No quote repair or field concatenation is performed.
export function parseCsvRows(text) {
  const rows = []
  let row = [], field = '', state = 'start', line = 1, column = 1
  const fail = (message) => { throw new Error(`CSV line ${line}, column ${column}: ${message}`) }
  const finishField = () => { row.push(field); field = ''; state = 'start' }
  const finishRow = () => { finishField(); rows.push(row); row = [] }
  for (let i = 0; i < text.length; i++, column++) {
    const char = text[i]
    if (state === 'quoted') {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; column++ }
        else state = 'closed'
      } else {
        if ((char.charCodeAt(0) < 32 && char !== '\r' && char !== '\n') || char.charCodeAt(0) === 127) fail('Unexpected control character.')
        field += char; if (char === '\n') { line++; column = 0 }
      }
      continue
    }
    if (char === ',' || char === '\n' || char === '\r') {
      if (char === ',') finishField()
      else {
        if (char === '\r') {
          if (text[i + 1] !== '\n') fail('A carriage return must be followed by a newline.')
          i++
        }
        finishRow(); line++; column = 0
      }
      continue
    }
    if (state === 'closed') fail('Only a comma or newline may follow a closing quote.')
    if (char === '"') {
      if (state !== 'start') fail('A quote cannot appear inside an unquoted field.')
      state = 'quoted'
    } else {
      if (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) fail('Unexpected control character.')
      field += char; state = 'unquoted'
    }
  }
  if (state === 'quoted') fail('Unclosed quoted field.')
  if (state !== 'start' || field.length || row.length) finishRow()
  return rows
}

export function parseTelemetryCsv(text) {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) throw new Error('Invalid CSV. Include a header row and at least one telemetry row.')
  const headers = rows[0].map((header) => header.trim().toLowerCase())
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) throw new Error('CSV headers must be nonempty and unique.')
  const missing = TELEMETRY_REQUIRED.filter((key) => !headers.includes(key))
  if (missing.length) throw new Error(`Missing required CSV columns: ${missing.join(', ')}`)
  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) throw new Error(`CSV row ${index + 2} has the wrong number of columns.`)
    try { return normalizeTelemetry(Object.fromEntries(headers.map((header, i) => [header, values[i]]))) }
    catch (error) { throw new Error(`CSV row ${index + 2}: ${error.message}`) }
  })
}
