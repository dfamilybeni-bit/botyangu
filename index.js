const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')
const http = require('http')

const NAMBA = '255680279792'
const BOTNAME = 'HB OFFICIAL'
const OWNERNAME = 'HB OFFICIAL'
const PREFIX = '.'

let WELCOME_ON = true
let ANTILINK_ON = true

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
    PREFIX + 'owner - mmiliki wa bot',
    PREFIX + 'time - saa ya sasa',
    PREFIX + 'hello - salamu',
    PREFIX + 'welcome on/off - washa/zima karibu',
    PREFIX + 'antilink on/off - washa/zima ulinzi wa link'
  ].join('\n')
}

const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com)/i

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

  // Welcome/Goodbye kwa wanachama wapya wa group
  sock.ev.on('group-participants.update', async (event) => {
    if (!WELCOME_ON) return
    const { id, participants, action } = event
    for (const p of participants) {
      const jina = '@' + p.split('@')[0]
      if (action === 'add') {
        await sock.sendMessage(id, { text: 'Karibu ' + jina + ' kwenye group!', mentions: [p] })
      } else if (action === 'remove') {
        await sock.sendMessage(id, { text: 'Kwaheri ' + jina, mentions: [p] })
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message) return
    const jid = m.key.remoteJid
    const isGroup = jid.endsWith('@g.us')
    const text = m.message.conversation || m.message.extendedTextMessage?.text || ''
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: m })

    // Antilink kwenye group
    if (isGroup && ANTILINK_ON && !m.key.fromMe && LINK_REGEX.test(text)) {
      try {
        await sock.sendMessage(jid, { delete: m.key })
        await reply('Link hairuhusiwi kwenye group hii.')
      } catch (e) {}
      return
    }

    if (!text.startsWith(PREFIX)) return
    const parts = text.slice(PREFIX.length).trim().split(' ')
    const cmd = parts[0].toLowerCase()
    const arg = parts[1]?.toLowerCase()

    if (cmd === 'ping') await reply('Pong! ' + BOTNAME + ' inafanya kazi')
    else if (cmd === 'menu') await reply(menuText())
    else if (cmd === 'runtime') await reply('Runtime: ' + runtime())
    else if (cmd === 'owner') await reply('Mmiliki: ' + OWNERNAME)
    else if (cmd === 'time') await reply('Saa ya sasa: ' + new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' }))
    else if (cmd === 'hello') await reply('Habari! Mimi ni ' + BOTNAME + ', niko tayari kukusaidia.')
    else if (cmd === 'welcome') {
      if (arg === 'on') { WELCOME_ON = true; await reply('Welcome imewashwa.') }
      else if (arg === 'off') { WELCOME_ON = false; await reply('Welcome imezimwa.') }
      else await reply('Tumia: ' + PREFIX + 'welcome on/off')
    }
    else if (cmd === 'antilink') {
      if (arg === 'on') { ANTILINK_ON = true; await reply('Antilink imewashwa.') }
      else if (arg === 'off') { ANTILINK_ON = false; await reply('Antilink imezimwa.') }
      else await reply('Tumia: ' + PREFIX + 'antilink on/off')
    }
  })
}
start()

http.createServer((req, res) => res.end('Bot iko hewani')).listen(process.env.PORT || 3000)
