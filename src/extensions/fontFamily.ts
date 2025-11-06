import { Extension } from '@tiptap/core'

const sanitizeFontFamily = (fontFamily: string) => {
  const base = fontFamily.split(',')[0]?.trim() ?? ''
  return base.replace(/^['"]|['"]$/g, '')
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType
      unsetFontFamily: () => ReturnType
    }
  }
}

export const FontFamily = Extension.create({
  name: 'fontFamily',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) {
                return {}
              }

              return {
                style: `font-family: ${attributes.fontFamily}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }) =>
          chain()
            .setMark('textStyle', { fontFamily: sanitizeFontFamily(fontFamily) })
            .run(),

      unsetFontFamily:
        () =>
        ({ chain }) =>
          chain()
            .setMark('textStyle', { fontFamily: null })
            .removeEmptyTextStyle()
            .run(),
    }
  },
})


