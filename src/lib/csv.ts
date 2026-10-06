export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

const escape = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV com ";" e BOM — abre corretamente no Excel em pt-BR. */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]) {
  const lines = [columns.map((c) => escape(c.header)).join(';'), ...rows.map((r) => columns.map((c) => escape(c.value(r))).join(';'))]
  return '\uFEFF' + lines.join('\r\n')
}

export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
