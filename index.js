const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')

const NAMBA = '255680279792'
const BOTNAME = 'HB OFFICIAL'
const OWNERNAME = 'HB OFFICIAL'
const PREFIX = '.'

const startTime = Date.now()

function runtime() {
  const s = Math.floor((Date.now() - startTime) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h + 'h ' + m + 'm ' + (s % 60) + 's'
}

function menuText() {
  return [
    '*' + BOTNAME + '*',
    '',
    'Owner: ' + OWNERNAME,
    'Prefix: ' + PREFIX,
    'Runtime: ' + runtime(),
    '',
    '*Amri:*',
    PREFIX + 'menu - orodha ya amri',
    PREFIX + 'ping - jaribu bot',
    PREFIX + 'runtime - muda bot imekuwa hewani',
    PREFIX + 'owner - mmiliki wa bot'
  ].join('\n')
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('session')
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) })
  sock.ev.on('creds.update', saveCreds)

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      const code = await sock.requestPairingCode(NAMBA)
      console.log('PAIRING CODE:', code)
    }, 3000)
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('Bot imeunganishwa!')
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) start()
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message) return
    const text = m.message.conversation || m.message.extendedTextMessage?.text || ''
    if (!text.startsWith(PREFIX)) return
    const cmd = text.slice(PREFIX.length).trim().split(' ')[0].toLowerCase()
    const jid = m.key.remoteJid
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: m })

    if (cmd === 'ping') await reply('Pong! ' + BOTNAME + ' inafanya kazi')
    else if (cmd === 'menu') await reply(menuText())
    else if (cmd === 'runtime') await reply('Runtime: ' + runtime())
    else if (cmd === 'owner') await reply('Mmiliki: ' + OWNERNAME)
  })
}
start()
