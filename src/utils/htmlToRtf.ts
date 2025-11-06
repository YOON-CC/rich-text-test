type ListContext = {
  type: 'ul' | 'ol'
  counter: number
}

interface RenderContext {
  listStack: ListContext[]
  tableDepth: number
}

type FontEntry = {
  index: number
  definition: string
  aliases: string[]
}

const FONT_ENTRIES: FontEntry[] = [
  { index: 0, definition: '{\\f0\\fnil\\fcharset0 Arial;}', aliases: ['arial', 'sans-serif'] },
  { index: 1, definition: '{\\f1\\fnil\\fcharset0 Consolas;}', aliases: ['consolas', 'monospace'] },
  { index: 2, definition: '{\\f2\\fnil\\fcharset129 Malgun Gothic;}', aliases: ['malgun gothic', '맑은 고딕'] },
  { index: 3, definition: '{\\f3\\fnil\\fcharset129 Gulim;}', aliases: ['gulim', '굴림'] },
  { index: 4, definition: '{\\f4\\fnil\\fcharset129 Dotum;}', aliases: ['dotum', '돋움'] },
  { index: 5, definition: '{\\f5\\fnil\\fcharset129 Batang;}', aliases: ['batang', '바탕'] },
  { index: 6, definition: '{\\f6\\fnil\\fcharset0 Courier New;}', aliases: ['courier new'] },
  { index: 7, definition: '{\\f7\\fnil\\fcharset0 Times New Roman;}', aliases: ['times new roman', 'serif'] },
  { index: 8, definition: '{\\f8\\fnil\\fcharset129 "Noto Sans KR";}', aliases: ['noto sans kr'] },
  { index: 9, definition: '{\\f9\\fnil\\fcharset129 "Noto Serif KR";}', aliases: ['noto serif kr'] },
  { index: 10, definition: '{\\f10\\fnil\\fcharset129 "Nanum Gothic";}', aliases: ['nanum gothic'] },
  { index: 11, definition: '{\\f11\\fnil\\fcharset129 "Nanum Myeongjo";}', aliases: ['nanum myeongjo'] },
]

const FONT_INDEX_MAP = new Map<string, number>()

FONT_ENTRIES.forEach((entry) => {
  entry.aliases.forEach((alias) => {
    FONT_INDEX_MAP.set(alias.toLowerCase(), entry.index)
  })
})

const FONT_TABLE_RTF = `{\\fonttbl${FONT_ENTRIES.map((entry) => entry.definition).join('')}}`

const RTF_HEADER = [
  '{\\rtf1\\ansi\\deff0\\uc1',
  FONT_TABLE_RTF,
  '{\\colortbl;\\red17\\green45\\blue78;}',
  '\\viewkind4\\paperw11906\\paperh16838\\margl1440\\margr1440',
  '',
].join('\n')

const RTF_FOOTER = '\n}'
const BASE_FONT_SIZE = 24

const SIGNED_LIMIT = 0x7fff

const convertPxToRtfFontSize = (value: string | null): number | null => {
  if (!value) {
    return null
  }

  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)(px)?$/)

  if (!match) {
    return null
  }

  const px = Number.parseFloat(match[1])

  if (Number.isNaN(px)) {
    return null
  }

  const points = (px * 72) / 96
  return Math.max(1, Math.round(points * 2))
}

const normalizeFontFamilyName = (value: string | null) => {
  if (!value) {
    return null
  }

  const base = value.split(',')[0]?.trim() ?? ''
  return base.replace(/^['"]|['"]$/g, '').toLowerCase()
}

const getFontFamilyIndex = (value: string | null): number | null => {
  const normalized = normalizeFontFamilyName(value)

  if (!normalized) {
    return null
  }

  return FONT_INDEX_MAP.get(normalized) ?? null
}

const encodeText = (text: string) => {
  return Array.from(text.replace(/\r\n/g, '\n'))
    .map((char) => {
      if (char === '\\' || char === '{' || char === '}') {
        return `\\${char}`
      }

      if (char === '\n') {
        return '\\line '
      }

      if (char === '\t') {
        return '\\tab '
      }

      const code = char.codePointAt(0) ?? char.charCodeAt(0)

      if (code > 126) {
        const signed = code > SIGNED_LIMIT ? code - 0x10000 : code
        return `\\u${signed}?`
      }

      return char
    })
    .join('')
}

const renderNodes = (nodes: NodeListOf<ChildNode>, context: RenderContext): string =>
  Array.from(nodes)
    .map((node) => renderNode(node, context))
    .join('')

const wrapParagraph = (content: string, context: RenderContext, extra = '') => {
  const value = content.trim()

  if (!value) {
    return ''
  }

  const tableFlag = context.tableDepth > 0 ? '\\intbl' : ''

  return `{\\pard${tableFlag}\\sa200\\sl276\\slmult1\\fs${BASE_FONT_SIZE}${extra ? ` ${extra}` : ''} ${value}\\par}`
}

const renderHeading = (tag: 'h1' | 'h2' | 'h3', content: string, context: RenderContext) => {
  const sizes: Record<typeof tag, number> = {
    h1: 48,
    h2: 40,
    h3: 32,
  }

  const value = content.trim()

  if (!value) {
    return ''
  }

  const tableFlag = context.tableDepth > 0 ? '\\intbl' : ''

  return `{\\pard${tableFlag}\\sa280\\sl276\\slmult1\\b\\fs${sizes[tag]} ${value}\\b0\\fs${BASE_FONT_SIZE}\\par}`
}

const renderListItem = (content: string, marker: string, context: RenderContext) => {
  const value = content.trim()

  if (!value) {
    return ''
  }

  const tableFlag = context.tableDepth > 0 ? '\\intbl' : ''

  return `{\\pard${tableFlag}\\sa120\\sl276\\slmult1\\li720\\fi-360\\fs${BASE_FONT_SIZE} ${marker}\\tab ${value}\\par}`
}

const TABLE_DEFAULT_WIDTH = 9000

const renderTable = (element: HTMLTableElement, context: RenderContext) => {
  const rows = Array.from(element.querySelectorAll('tr'))
  if (!rows.length) {
    return ''
  }

  const columnCount = rows.reduce((maxCols, row) => {
    const cells = Array.from(row.children).filter((cell) => {
      const tagName = cell.tagName.toLowerCase()
      return tagName === 'td' || tagName === 'th'
    })

    const totalSpan = cells.reduce((total, cell) => {
      const colspan = Number.parseInt(cell.getAttribute('colspan') ?? '1', 10)
      return total + (Number.isFinite(colspan) && colspan > 0 ? colspan : 1)
    }, 0)

    return Math.max(maxCols, totalSpan)
  }, 0)

  if (!columnCount) {
    return ''
  }

  const columnWidth = Math.floor(TABLE_DEFAULT_WIDTH / columnCount)
  const columnBoundaries = Array.from({ length: columnCount }, (_, index) => columnWidth * (index + 1))

  const renderedRows = rows
    .map((row) => renderTableRow(row as HTMLTableRowElement, context, columnBoundaries))
    .filter(Boolean)

  return renderedRows.join('')
}

const renderTableRow = (
  row: HTMLTableRowElement,
  context: RenderContext,
  columnBoundaries: number[],
) => {
  const cells = Array.from(row.children).filter((cell) => {
    const tagName = cell.tagName.toLowerCase()
    return tagName === 'td' || tagName === 'th'
  })

  if (!cells.length) {
    return ''
  }

  let columnIndex = 0
  const boundaries: number[] = []

  const rowContext: RenderContext = {
    listStack: context.listStack,
    tableDepth: context.tableDepth + 1,
  }

  const cellContents = cells.map((cell) => {
    const colspanAttr = Number.parseInt(cell.getAttribute('colspan') ?? '1', 10)
    const span = Number.isNaN(colspanAttr) || colspanAttr <= 0 ? 1 : colspanAttr
    columnIndex += span

    const boundaryIndex = Math.min(columnIndex, columnBoundaries.length) - 1
    const boundary = columnBoundaries[Math.max(boundaryIndex, 0)]
    boundaries.push(boundary)

    const inner = renderNodes(cell.childNodes, rowContext).trim() || '\\~'
    const tagName = cell.tagName.toLowerCase()
    const styledInner = tagName === 'th' ? `\\b ${inner}\\b0` : inner

    return `${styledInner}\\cell`
  })

  const rowHeader = `\\trowd\\trgaph108\\trleft0${boundaries.map((value) => `\\cellx${value}`).join('')}`

  return `{${rowHeader}${cellContents.join('')}\\row}\n`
}

const escapeHref = (href: string) => href.replace(/"/g, '\\"')

const renderNode = (node: ChildNode, context: RenderContext): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return encodeText(node.textContent ?? '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()

  switch (tag) {
    case 'p':
    case 'div':
    case 'section':
    case 'article':
      return wrapParagraph(renderNodes(element.childNodes, context), context)

    case 'span': {
      const inner = renderNodes(element.childNodes, context)

      if (!inner) {
        return ''
      }

      const fontSizeToken = convertPxToRtfFontSize(element.style?.fontSize ?? null)
      const fontFamilyIndex = getFontFamilyIndex(element.style?.fontFamily ?? null)

      if (!fontSizeToken && fontFamilyIndex === null) {
        return inner
      }

      const controls: string[] = []

      if (fontFamilyIndex !== null) {
        controls.push(`\\f${fontFamilyIndex}`)
      }

      if (fontSizeToken) {
        controls.push(`\\fs${fontSizeToken}`)
      }

      const controlString = controls.join('')

      return `{${controlString} ${inner}}`
    }

    case 'strong':
    case 'b': {
      const inner = renderNodes(element.childNodes, context)
      return inner ? `\\b ${inner}\\b0` : ''
    }

    case 'em':
    case 'i': {
      const inner = renderNodes(element.childNodes, context)
      return inner ? `\\i ${inner}\\i0` : ''
    }

    case 'u': {
      const inner = renderNodes(element.childNodes, context)
      return inner ? `\\ul ${inner}\\ul0` : ''
    }

    case 's':
    case 'strike': {
      const inner = renderNodes(element.childNodes, context)
      return inner ? `\\strike ${inner}\\strike0` : ''
    }

    case 'code': {
      if (element.parentElement?.tagName?.toLowerCase() === 'pre') {
        return ''
      }

      const text = element.textContent ?? ''
      const encoded = encodeText(text)
      return encoded ? `\\f1 ${encoded}\\f0` : ''
    }

    case 'pre': {
      const text = element.textContent ?? ''
      const encoded = encodeText(text)
      const tableFlag = context.tableDepth > 0 ? '\\intbl' : ''
      return encoded
        ? `{\\pard${tableFlag}\\sa200\\sl276\\slmult1\\f1\\cb1 ${encoded}\\cb0\\f0\\par}`
        : ''
    }

    case 'blockquote':
      return wrapParagraph(renderNodes(element.childNodes, context), context, '\\li720\\sl240')

    case 'br':
      return '\\line '

    case 'input': {
      const inputType = element.getAttribute('type')?.toLowerCase()

      if (inputType === 'checkbox') {
        const checked = element.hasAttribute('checked')
        return encodeText(checked ? '☑ ' : '☐ ')
      }

      return ''
    }

    case 'ul':
    case 'ol': {
      context.listStack.push({ type: tag as 'ul' | 'ol', counter: 0 })
      const result = renderNodes(element.childNodes, context)
      context.listStack.pop()
      return result
    }

    case 'li': {
      const current = context.listStack[context.listStack.length - 1]
      const inner = renderNodes(element.childNodes, context)

      if (!current) {
        return wrapParagraph(inner, context)
      }

      if (current.type === 'ol') {
        current.counter += 1
        return renderListItem(inner, `${current.counter}.`, context)
      }

      return renderListItem(inner, '\\bullet', context)
    }

    case 'h1':
    case 'h2':
    case 'h3':
      return renderHeading(tag as 'h1' | 'h2' | 'h3', renderNodes(element.childNodes, context), context)

    case 'a': {
      const href = element.getAttribute('href')
      const text = renderNodes(element.childNodes, context) || encodeText(element.textContent ?? '')

      if (!href) {
        return text
      }

      return `{\\field{\\*\\fldinst HYPERLINK "${escapeHref(href)}"}{\\fldrslt ${text}}}`
    }

    case 'table':
      return renderTable(element as HTMLTableElement, context)

    case 'hr':
      return '{\\pard\\sa200\\sl276\\slmult1\\fs20 \\emdash\\emdash\\emdash\\emdash\\par}'

    default:
      return renderNodes(element.childNodes, context)
  }
}

const isBrowser = typeof window !== 'undefined' && typeof DOMParser !== 'undefined'

export const htmlToRtf = (html: string) => {
  if (!isBrowser) {
    return ''
  }

  const parser = new DOMParser()
  const documentFragment = parser.parseFromString(html, 'text/html')
  const context: RenderContext = { listStack: [], tableDepth: 0 }
  const content = renderNodes(documentFragment.body.childNodes, context)

  return `${RTF_HEADER}${content}${RTF_FOOTER}`
}



