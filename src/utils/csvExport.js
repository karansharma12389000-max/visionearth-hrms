// src/utils/csvExport.js
//
// Tiny CSV export helper for Vision Earth HRMS.
// Generates a CSV blob and triggers a browser download.
// Works with Google Sheets, Excel, LibreOffice, etc.
//
// Supports:
//   - linkColumns: array of keys → output as =HYPERLINK("url", "Open")
//   - textColumns: array of keys → output as ="value" (forces text,
//     avoids the #### date-column bug in Google Sheets)

const escapeCell = (value) => {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

// Wrap a value as a Google Sheets formula → forces text.
// Example: "08-10-2026" → `="08-10-2026"`
const asTextFormula = (value) => {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/"/g, '""');
  return `"=""${s}"""`;
};

// Wrap a URL as a Google Sheets HYPERLINK formula.
// Example: ("https://x.com", "Open") → `=HYPERLINK("https://x.com","Open")`
const asHyperlinkFormula = (url, label = 'Open') => {
  if (!url) return '';
  const safeUrl = String(url).replace(/"/g, '""');
  const safeLabel = String(label).replace(/"/g, '""');
  return `"=HYPERLINK(""${safeUrl}"",""${safeLabel}"")"`;
};

/**
 * Convert an array of objects to a CSV string.
 *
 * @param {Array<Object>} rows
 * @param {Array<{key,label}>} columns
 * @param {Object} [opts]
 * @param {string[]} [opts.linkColumns] - keys to render as HYPERLINK formulas
 * @param {string[]} [opts.textColumns] - keys to force as text (avoid ####)
 */
export const buildCSV = (rows, columns, opts = {}) => {
  const linkColumns = opts.linkColumns || [];
  const textColumns = opts.textColumns || [];

  const header = columns.map((c) => escapeCell(c.label)).join(',');

  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const raw = row[col.key];

          if (linkColumns.includes(col.key)) {
            if (!raw) return '';
            return asHyperlinkFormula(raw, 'Open');
          }

          if (textColumns.includes(col.key)) {
            if (raw === null || raw === undefined || raw === '') return '';
            return asTextFormula(raw);
          }

          return escapeCell(raw);
        })
        .join(',')
    )
    .join('\n');

  return `${header}\n${body}`;
};

export const downloadCSV = (filename, csvText) => {
  const blob = new Blob(['\uFEFF' + csvText], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);  
};

export const timestamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}`;
};