import HtmlToRtfBrowser from 'html-to-rtf-browser'

const converter = new HtmlToRtfBrowser()

const normalizeUnicode = (rtf: string) =>
  rtf.replace(/\\u(-?\d+)\?/g, (match, codePoint) => {
    const code = Number.parseInt(codePoint, 10)

    if (Number.isNaN(code)) {
      return match
    }

    const signed = code > 0x7fff ? code - 0x10000 : code < -0x8000 ? code + 0x10000 : code

    return `\\u${signed}?`
  })

export const htmlToRtf = (html: string) => normalizeUnicode(converter.convertHtmlToRtf(html))


