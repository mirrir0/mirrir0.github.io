import '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bold: {
      /**
       * Set a bold mark
       */
      setBold: () => ReturnType;
      /**
       * Toggle a bold mark
       */
      toggleBold: () => ReturnType;
      /**
       * Unset a bold mark
       */
      unsetBold: () => ReturnType;
    };
    italic: {
      /**
       * Set an italic mark
       */
      setItalic: () => ReturnType;
      /**
       * Toggle an italic mark
       */
      toggleItalic: () => ReturnType;
      /**
       * Unset an italic mark
       */
      unsetItalic: () => ReturnType;
    };
    strike: {
      /**
       * Set a strike mark
       */
      setStrike: () => ReturnType;
      /**
       * Toggle a strike mark
       */
      toggleStrike: () => ReturnType;
      /**
       * Unset a strike mark
       */
      unsetStrike: () => ReturnType;
    };
    code: {
      /**
       * Set a code mark
       */
      setCode: () => ReturnType;
      /**
       * Toggle a code mark
       */
      toggleCode: () => ReturnType;
      /**
       * Unset a code mark
       */
      unsetCode: () => ReturnType;
    };
    heading: {
      /**
       * Set a heading node
       */
      setHeading: (attributes: { level: 1 | 2 | 3 | 4 | 5 | 6 }) => ReturnType;
      /**
       * Toggle a heading node
       */
      toggleHeading: (attributes: { level: 1 | 2 | 3 | 4 | 5 | 6 }) => ReturnType;
    };
    bulletList: {
      /**
       * Toggle a bullet list
       */
      toggleBulletList: () => ReturnType;
    };
    orderedList: {
      /**
       * Toggle an ordered list
       */
      toggleOrderedList: () => ReturnType;
    };
    blockquote: {
      /**
       * Toggle a blockquote
       */
      toggleBlockquote: () => ReturnType;
    };
    codeBlock: {
      /**
       * Set a code block
       */
      setCodeBlock: () => ReturnType;
      /**
       * Toggle a code block
       */
      toggleCodeBlock: () => ReturnType;
    };
    horizontalRule: {
      /**
       * Add a horizontal rule
       */
      setHorizontalRule: () => ReturnType;
    };
    link: {
      /**
       * Set a link mark
       */
      setLink: (attributes: { href: string; target?: string }) => ReturnType;
      /**
       * Toggle a link mark
       */
      toggleLink: (attributes: { href: string; target?: string }) => ReturnType;
      /**
       * Unset a link mark
       */
      unsetLink: () => ReturnType;
    };
    image: {
      /**
       * Add an image
       */
      setImage: (attributes: { src: string; alt?: string; title?: string }) => ReturnType;
    };
  }
}
