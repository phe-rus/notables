/** Book typography for e-readers; readers may override fonts and sizes. */
export const epubStylesheet = `
body { font-family: Georgia, "Iowan Old Style", serif; line-height: 1.6; margin: 0 5%; }
h1, h2, h3 { line-height: 1.2; page-break-after: avoid; }
.cover { margin: 0; padding: 0; text-align: center; height: 100%; }
.cover img { max-width: 100%; max-height: 100%; }
.title-page { text-align: center; margin-top: 30%; }
.title-page h1 { font-size: 2em; margin-bottom: 0.3em; }
.subtitle { font-style: italic; color: #555; }
.author { margin-top: 3em; font-family: Helvetica, Arial, sans-serif; font-size: 0.8em; letter-spacing: 0.14em; text-transform: uppercase; color: #555; }
.chapter { page-break-before: always; }
.chapter-number { margin-top: 15%; font-family: Helvetica, Arial, sans-serif; font-size: 0.75em; letter-spacing: 0.16em; text-transform: uppercase; color: #8a5a00; }
.chapter h1 { margin-top: 0.2em; margin-bottom: 1.2em; }
p { margin: 0 0 0.8em; text-align: justify; }
blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid #e8a200; font-style: italic; color: #444; }
figure { margin: 1.2em 0; text-align: center; page-break-inside: avoid; }
figure img { max-width: 100%; }
figure.audio figcaption { font-style: italic; color: #555; text-align: left; }
figure.audio .audio-note { font-family: Helvetica, Arial, sans-serif; font-size: 0.75em; color: #8a5a00; text-align: left; }
figcaption { font-size: 0.85em; color: #666; margin-top: 0.4em; }
mark { background: #ffe58a; }
pre { white-space: pre-wrap; font-family: Menlo, monospace; font-size: 0.85em; }
.nt-li-checked { text-decoration: line-through; color: #777; }
.missing { font-style: italic; color: #777; }
`;
