// 要件定義書.md を読み、見出し・表・枠付きのコードを整えた 要件定義書.docx を作る。
// 使い方: このフォルダで `npm install`(初回だけ)→ `npm run build`
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { marked } from 'marked'

const here = path.dirname(fileURLToPath(import.meta.url))
const SOURCE = path.resolve(here, '../../要件定義書.md')
const OUTPUT = path.resolve(here, '../../要件定義書.docx')

// 読みやすさに配慮した Windows 標準の字体(UD = ユニバーサルデザイン)
const FONT = 'BIZ UDPゴシック'
const MONO = 'BIZ UDゴシック'
const TEXT_COLOR = '111111'
const HEADING_COLOR = '003A70'
const BORDER_COLOR = '555555'
const BODY_SIZE = 28 // 半ポイント単位(28 = 14pt)
const SMALL_SIZE = 24 // 12pt(表とコード)

// A4、余白 2cm。1cm = 567 DXA
const PAGE_WIDTH = 11906
const MARGIN = 1134
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const decode = (text) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

// ---- 行の中の文字(太字・コード・改行) ----
function inlineRuns(tokens = [], style = {}) {
  const runs = []
  for (const token of tokens) {
    switch (token.type) {
      case 'strong':
        runs.push(...inlineRuns(token.tokens, { ...style, bold: true }))
        break
      case 'em':
        runs.push(...inlineRuns(token.tokens, { ...style, italics: true }))
        break
      case 'codespan':
        runs.push(
          new TextRun({
            ...style,
            text: decode(token.text),
            font: MONO,
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E8E8E8' },
          }),
        )
        break
      case 'link':
        runs.push(...inlineRuns(token.tokens, { ...style, underline: {}, color: HEADING_COLOR }))
        break
      case 'br':
        runs.push(new TextRun({ ...style, break: 1 }))
        break
      default: {
        if (token.tokens) {
          runs.push(...inlineRuns(token.tokens, style))
          break
        }
        // md の中の改行は、Word でも改行にする
        decode(token.text ?? token.raw ?? '')
          .split('\n')
          .forEach((line, i) => runs.push(new TextRun({ ...style, text: line, break: i > 0 ? 1 : 0 })))
      }
    }
  }
  return runs
}

// ---- 表 ----
const cellText = (cell) => decode(cell.text ?? '')

// 漢字・かなは英数字のおよそ2倍の幅なので、2文字分として数える
const displayWidth = (text) => [...text].reduce((sum, ch) => sum + (ch.codePointAt(0) > 0x2e80 ? 2 : 1), 0)

function columnWidths(header, rows) {
  const lengths = header.map((_, col) =>
    Math.max(...[header, ...rows].map((row) => displayWidth(cellText(row[col]))), 4),
  )
  const capped = lengths.map((n) => Math.min(n, 44))
  const total = capped.reduce((a, b) => a + b, 0)
  const widths = capped.map((n) => Math.max(1400, Math.floor((CONTENT_WIDTH * n) / total)))
  const scale = CONTENT_WIDTH / widths.reduce((a, b) => a + b, 0)
  const scaled = widths.map((w) => Math.floor(w * scale))
  scaled[scaled.length - 1] += CONTENT_WIDTH - scaled.reduce((a, b) => a + b, 0)
  return scaled
}

const cellBorder = { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR }
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder }

function tableBlock(token) {
  const widths = columnWidths(token.header, token.rows)
  const makeRow = (cells, isHeader) =>
    new TableRow({
      tableHeader: isHeader,
      cantSplit: true,
      children: cells.map(
        (cell, col) =>
          new TableCell({
            width: { size: widths[col], type: WidthType.DXA },
            borders: cellBorders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            shading: isHeader ? { type: ShadingType.CLEAR, color: 'auto', fill: 'D9E2F3' } : undefined,
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0, line: 300 },
                children: inlineRuns(cell.tokens, { size: SMALL_SIZE, bold: isHeader || undefined }),
              }),
            ],
          }),
      ),
    })
  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: widths,
      rows: [makeRow(token.header, true), ...token.rows.map((row) => makeRow(row, false))],
    }),
    new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }),
  ]
}

// ---- 構成図・JSON などのコード(灰色の枠の中に等幅で) ----
const codeBorder = { style: BorderStyle.SINGLE, size: 6, color: '888888', space: 6 }

function codeBlock(token) {
  const lines = token.text.split('\n')
  return lines.map(
    (line, i) =>
      new Paragraph({
        spacing: { before: i === 0 ? 120 : 0, after: i === lines.length - 1 ? 200 : 0, line: 300 },
        indent: { left: 160, right: 160 },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' },
        border: { top: codeBorder, bottom: codeBorder, left: codeBorder, right: codeBorder },
        keepLines: true,
        keepNext: i < lines.length - 1,
        children: [new TextRun({ text: line === '' ? ' ' : line, font: MONO, size: SMALL_SIZE })],
      }),
  )
}

// ---- 箇条書き(番号付きは、リストごとに 1 から数え直す) ----
let numberedListCount = 0

function listBlock(token, level = 0, instance = null) {
  const blocks = []
  const listInstance = token.ordered ? (instance ?? ++numberedListCount) : null
  for (const item of token.items) {
    let first = true
    for (const child of item.tokens) {
      if (child.type === 'list') {
        blocks.push(...listBlock(child, level + 1, child.ordered ? ++numberedListCount : null))
      } else if (child.type === 'text' || child.type === 'paragraph') {
        blocks.push(
          new Paragraph({
            numbering: token.ordered
              ? { reference: 'numbered', level, instance: listInstance }
              : { reference: 'bullets', level },
            spacing: { before: 0, after: 60 },
            // 番号付きの項目の続きの段落は、番号を付けずに字下げだけそろえる
            ...(first ? {} : { numbering: undefined, indent: { left: 720 * (level + 1) } }),
            children: inlineRuns(child.tokens ?? [child]),
          }),
        )
        first = false
      } else {
        blocks.push(...toBlocks([child]))
      }
    }
  }
  return blocks
}

// ---- 全体 ----
const HEADINGS = [HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3]

function toBlocks(tokens) {
  const blocks = []
  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        blocks.push(
          new Paragraph({
            heading: HEADINGS[Math.min(token.depth, 4) - 1],
            children: inlineRuns(token.tokens),
          }),
        )
        if (token.depth === 1) {
          blocks.push(
            new Paragraph({
              spacing: { after: 240 },
              children: [
                new TextRun({
                  text: 'この文書は「要件定義書.md」から自動で作成しています。内容を直すときは md を直し、作り直してください。',
                  size: SMALL_SIZE,
                  color: '444444',
                }),
              ],
            }),
          )
        }
        break
      case 'paragraph':
        blocks.push(new Paragraph({ children: inlineRuns(token.tokens) }))
        break
      case 'list':
        blocks.push(...listBlock(token))
        break
      case 'table':
        blocks.push(...tableBlock(token))
        break
      case 'code':
        blocks.push(...codeBlock(token))
        break
      case 'blockquote':
        blocks.push(...toBlocks(token.tokens))
        break
      case 'hr':
        blocks.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR, space: 4 } },
            children: [],
          }),
        )
        break
      default:
        break
    }
  }
  return blocks
}

const bulletLevels = ['●', '○', '■'].map((symbol, level) => ({
  level,
  format: LevelFormat.BULLET,
  text: symbol,
  alignment: AlignmentType.LEFT,
  style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
}))

const numberedLevels = [LevelFormat.DECIMAL, LevelFormat.DECIMAL, LevelFormat.DECIMAL].map((format, level) => ({
  level,
  format,
  text: level === 0 ? '%1.' : level === 1 ? '(%2)' : '%3)',
  alignment: AlignmentType.LEFT,
  style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 480 } } },
}))

const headingStyle = (id, name, size, extra = {}) => ({
  id,
  name,
  basedOn: 'Normal',
  next: 'Normal',
  quickFormat: true,
  run: { font: FONT, size, bold: true, color: HEADING_COLOR },
  paragraph: { keepNext: true, keepLines: true, ...extra },
})

const markdown = readFileSync(SOURCE, 'utf8')
const tokens = marked.lexer(markdown)
const title = tokens.find((t) => t.type === 'heading' && t.depth === 1)?.text ?? '要件定義書'

const doc = new Document({
  title,
  creator: 'taskboard',
  styles: {
    default: {
      document: {
        run: { font: { ascii: FONT, eastAsia: FONT, hAnsi: FONT }, size: BODY_SIZE, color: TEXT_COLOR },
        paragraph: { spacing: { after: 120, line: 360 } },
      },
    },
    paragraphStyles: [
      headingStyle('Title', 'Title', 48, {
        spacing: { before: 0, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: HEADING_COLOR, space: 6 } },
      }),
      headingStyle('Heading1', 'Heading 1', 38, {
        spacing: { before: 480, after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: HEADING_COLOR, space: 4 } },
        outlineLevel: 0,
      }),
      headingStyle('Heading2', 'Heading 2', 32, { spacing: { before: 360, after: 120 }, outlineLevel: 1 }),
      headingStyle('Heading3', 'Heading 3', 29, { spacing: { before: 280, after: 100 }, outlineLevel: 2 }),
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: bulletLevels },
      { reference: 'numbered', levels: numberedLevels },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: 16838 },
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ children: ['ページ ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], size: SMALL_SIZE }),
              ],
            }),
          ],
        }),
      },
      children: toBlocks(tokens),
    },
  ],
})

writeFileSync(OUTPUT, await Packer.toBuffer(doc))
console.log(`作成しました: ${OUTPUT}`)
