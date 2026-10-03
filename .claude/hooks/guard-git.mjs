import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const PROTECTED = ['main', 'master']

function readParen(src, start) {
  let depth = 1
  let i = start
  while (i < src.length && depth > 0) {
    const c = src[i]
    if (c === "'") {
      const j = src.indexOf("'", i + 1)
      i = j < 0 ? src.length : j + 1
      continue
    }
    if (c === '"') {
      i++
      while (i < src.length && src[i] !== '"') i += src[i] === '\\' ? 2 : 1
      i++
      continue
    }
    if (c === '(') depth++
    if (c === ')') depth--
    i++
  }
  return { inner: src.slice(start, i - 1), next: i }
}

function readBacktick(src, start) {
  const j = src.indexOf('`', start)
  const end = j < 0 ? src.length : j
  return { inner: src.slice(start, end), next: end + 1 }
}

function stripHeredocBodies(src) {
  const out = []
  let terminator = null
  for (const line of src.split('\n')) {
    if (terminator !== null) {
      if (line.trim() === terminator) terminator = null
      continue
    }
    out.push(line)
    const m = line.match(/<<-?\s*(['"]?)(\w+)\1/)
    if (m && /\b(cat|git)\b/.test(line) && !/\b(ba|z|da|k)?sh\b|pwsh|powershell/i.test(line)) terminator = m[2]
  }
  return out.join('\n')
}

function parse(src) {
  const commands = []
  let tokens = []
  let cur = ''
  let has = false
  const pushToken = () => {
    if (has) tokens.push(cur)
    cur = ''
    has = false
  }
  const endCommand = () => {
    pushToken()
    if (tokens.length) commands.push(tokens)
    tokens = []
  }
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === "'") {
      const j = src.indexOf("'", i + 1)
      const end = j < 0 ? src.length : j
      cur += src.slice(i + 1, end)
      has = true
      i = end + 1
    } else if (c === '"') {
      i++
      has = true
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '$' && src[i + 1] === '(') {
          const { inner, next } = readParen(src, i + 2)
          commands.push(...parse(inner))
          i = next
        } else if (src[i] === '`') {
          const { inner, next } = readBacktick(src, i + 1)
          commands.push(...parse(inner))
          i = next
        } else {
          cur += src[i]
          i++
        }
      }
      i++
    } else if (c === '$' && src[i + 1] === '(') {
      const { inner, next } = readParen(src, i + 2)
      commands.push(...parse(inner))
      i = next
    } else if (c === '`') {
      const { inner, next } = readBacktick(src, i + 1)
      commands.push(...parse(inner))
      i = next
    } else if (';\n&|(){}'.includes(c)) {
      endCommand()
      i++
    } else if (/\s/.test(c)) {
      pushToken()
      i++
    } else {
      cur += c
      has = true
      i++
    }
  }
  endCommand()
  return commands
}

function currentBranch(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim()
  } catch {
    return null
  }
}

function block(reason) {
  process.stderr.write(
    `【ブロック】${reason}\n` +
      'このプロジェクトのルール(CLAUDE.md): 先にイシューを作り、「種類/イシュー番号-内容」のブランチを作って作業し、' +
      'プッシュはそのブランチだけに行い、main への取り込みは PR を経由します。\n',
  )
  process.exit(2)
}

const isProtected = (name) => PROTECTED.includes(name)

function stripRef(ref) {
  return ref.replace(/^\+/, '').replace(/^refs\/heads\//, '')
}

function checkPush(args, branch) {
  const positionals = []
  for (const a of args) {
    if (a === '--') continue
    if (a.startsWith('--')) {
      const name = a.split('=')[0]
      if (['--force', '--force-with-lease', '--force-if-includes', '--delete', '--all', '--mirror'].includes(name)) {
        block(`git push の ${name} は禁止です。`)
      }
      continue
    }
    if (/^-[A-Za-z]+$/.test(a)) {
      if (a.includes('f')) block('強制プッシュ(-f)は禁止です。')
      if (a.includes('d')) block('リモートブランチの削除(-d)は禁止です。')
      continue
    }
    positionals.push(a)
  }
  const refspecs = positionals.slice(1)
  if (refspecs.length === 0) {
    if (isProtected(branch)) block(`いま ${branch} ブランチにいるため、プッシュできません。`)
    return
  }
  for (const spec of refspecs) {
    if (spec.startsWith(':')) block('リモートブランチの削除は禁止です。')
    const dest = stripRef(spec.includes(':') ? spec.split(':')[1] : spec)
    if (isProtected(dest)) block(`${dest} への直接プッシュは禁止です。`)
    if (dest === 'HEAD' && isProtected(branch)) block(`いま ${branch} ブランチにいるため、プッシュできません。`)
  }
}

function applySwitch(args, branch) {
  const createFlags = ['-b', '-B', '-c', '-C']
  for (let i = 0; i < args.length; i++) {
    if (createFlags.includes(args[i]) && args[i + 1]) return args[i + 1]
  }
  if (args.includes('--')) return branch
  const target = args.find((a) => !a.startsWith('-'))
  return target ?? branch
}

function analyze(tokens, cwd, state) {
  let i = 0
  while (i < tokens.length && (/^\w+=/.test(tokens[i]) || tokens[i] === 'command')) i++
  const exe = (tokens[i] ?? '').split(/[\\/]/).pop().toLowerCase()
  if (exe !== 'git' && exe !== 'git.exe') return
  i++

  let dir = cwd
  let hasDir = false
  while (i < tokens.length && tokens[i].startsWith('-')) {
    const t = tokens[i]
    if (t === '-C' && tokens[i + 1]) {
      dir = path.resolve(dir, tokens[i + 1])
      hasDir = true
      i += 2
    } else if ((t === '-c' || t === '--git-dir' || t === '--work-tree' || t === '--namespace') && tokens[i + 1]) {
      i += 2
    } else {
      i++
    }
  }
  const sub = tokens[i]
  const args = tokens.slice(i + 1)
  if (!sub) return

  if (hasDir) {
    state.branch = currentBranch(dir)
  } else if (state.branch === undefined) {
    state.branch = currentBranch(cwd)
  }
  const branch = state.branch

  if (sub === 'checkout' || sub === 'switch') {
    state.branch = applySwitch(args, branch)
    return
  }
  if (sub === 'push') {
    checkPush(args, branch)
    return
  }
  if (['commit', 'merge', 'rebase', 'cherry-pick', 'revert'].includes(sub)) {
    const finishing = args.some((a) => ['--abort', '--continue', '--quit', '--skip'].includes(a))
    if (!finishing && isProtected(branch)) block(`いま ${branch} ブランチにいるため、git ${sub} はできません。`)
    return
  }
  if (sub === 'reset' && args.includes('--hard') && isProtected(branch)) {
    block(`いま ${branch} ブランチにいるため、git reset --hard はできません。`)
  }
  if (sub === 'branch') {
    const risky = args.some((a) => /^-[A-Za-z]*[fdDmM]/.test(a) || ['--force', '--delete', '--move'].includes(a))
    if (risky && args.some((a) => isProtected(a))) block('main / master の削除・移動・強制変更は禁止です。')
  }
}

let input
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0)
}

const command = input?.tool_input?.command
if (typeof command !== 'string' || !command.includes('git')) process.exit(0)

const cwd = input.cwd || process.cwd()
const state = { branch: undefined }
for (const tokens of parse(stripHeredocBodies(command))) analyze(tokens, cwd, state)
process.exit(0)
