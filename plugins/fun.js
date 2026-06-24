'use strict';

const axios = require('axios');
const { getBotName, createFakeContact, channelInfo } = require('../lib/messageConfig');
const { raceApis } = require('../lib/raceApi');

const A = (url, opts = {}) => axios.get(url, { timeout: 9000, headers: { 'User-Agent': 'Mozilla/5.0' }, ...opts });

async function _img(url) {
  const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  return Buffer.from(r.data);
}

const _box = (botName, lines) =>
  `╭─❖ *${botName}* ❖─╮\n` +
  lines.map(l => `│ ${l}`).join('\n') +
  `\n╰─────────────╯`;

function _send(sock, chatId, fake, lines) {
  return sock.sendMessage(chatId, { text: _box(getBotName(), lines), ...channelInfo }, { quoted: fake });
}

module.exports = [
  {
    name: 'joke',
    aliases: ['randomjoke'],
    category: 'fun',
    description: 'Get a random joke',
    usage: '.joke',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      const joke = await raceApis([
        async () => { const r = await A('https://official-joke-api.appspot.com/random_joke'); return r.data?.setup ? `${r.data.setup}\n\n${r.data.punchline}` : null; },
        async () => { const r = await A('https://api.popcat.xyz/joke'); return r.data?.joke || null; },
        async () => { const r = await A('https://v2.jokeapi.dev/joke/Any?type=twopart'); return r.data?.setup ? `${r.data.setup}\n\n${r.data.delivery}` : null; },
      ]);
      if (!joke) return sock.sendMessage(chatId, { text: `❌ No joke right now.` }, { quoted: fake });
      return _send(sock, chatId, fake, ['😂 *JOKE*', '', ...joke.split('\n')]);
    }
  },
  {
    name: 'advice',
    category: 'fun',
    description: 'Get random advice',
    usage: '.advice',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      const advice = await raceApis([
        async () => { const r = await A('https://api.adviceslip.com/advice'); return r.data?.slip?.advice || null; },
      ]);
      if (!advice) return sock.sendMessage(chatId, { text: `❌ No advice right now.` }, { quoted: fake });
      return _send(sock, chatId, fake, ['💡 *ADVICE*', '', advice]);
    }
  },
  {
    name: 'fact',
    aliases: ['uselessfact'],
    category: 'fun',
    description: 'Get a random useless fact',
    usage: '.fact',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      const fact = await raceApis([
        async () => { const r = await A('https://uselessfacts.jsph.pl/api/v2/facts/random'); return r.data?.text || null; },
        async () => { const r = await A('https://api.popcat.xyz/fact'); return r.data?.fact || null; },
      ]);
      if (!fact) return sock.sendMessage(chatId, { text: `❌ No fact right now.` }, { quoted: fake });
      return _send(sock, chatId, fake, ['🧠 *FACT*', '', fact]);
    }
  },
  {
    name: 'quote',
    aliases: ['inspire'],
    category: 'fun',
    description: 'Inspirational quote',
    usage: '.quote',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      const out = await raceApis([
        async () => { const r = await A('https://zenquotes.io/api/random'); const q = r.data?.[0]; return q ? `"${q.q}"\n\n— ${q.a}` : null; },
        async () => { const r = await A('https://api.kanye.rest/'); return r.data?.quote ? `"${r.data.quote}"\n\n— Kanye` : null; },
      ]);
      if (!out) return sock.sendMessage(chatId, { text: `❌ No quote right now.` }, { quoted: fake });
      return _send(sock, chatId, fake, ['💬 *QUOTE*', '', ...out.split('\n')]);
    }
  },
  {
    name: 'dog',
    category: 'fun',
    description: 'Random dog picture',
    usage: '.dog',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      await sock.sendMessage(chatId, { react: { text: '🐶', key: message.key } });
      try {
        const url = await raceApis([
          async () => { const r = await A('https://dog.ceo/api/breeds/image/random'); return r.data?.message || null; },
          async () => { const r = await A('https://api.thedogapi.com/v1/images/search'); return r.data?.[0]?.url || null; },
        ]);
        if (!url) throw new Error('no img');
        const buf = await _img(url);
        await sock.sendMessage(chatId, { image: buf, caption: `🐶 *${getBotName()}*` }, { quoted: fake });
      } catch { await sock.sendMessage(chatId, { text: `❌ No dog right now.` }, { quoted: fake }); }
    }
  },
  {
    name: 'cat',
    category: 'fun',
    description: 'Random cat picture',
    usage: '.cat',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      await sock.sendMessage(chatId, { react: { text: '🐱', key: message.key } });
      try {
        const url = await raceApis([
          async () => { const r = await A('https://api.thecatapi.com/v1/images/search'); return r.data?.[0]?.url || null; },
          async () => { const r = await A('https://cataas.com/cat?json=true'); return r.data?.url || (r.data?._id ? `https://cataas.com/cat/${r.data._id}` : null); },
        ]);
        if (!url) throw new Error('no img');
        const buf = await _img(url);
        await sock.sendMessage(chatId, { image: buf, caption: `🐱 *${getBotName()}*` }, { quoted: fake });
      } catch { await sock.sendMessage(chatId, { text: `❌ No cat right now.` }, { quoted: fake }); }
    }
  },
  {
    name: '8ball',
    aliases: ['eightball'],
    category: 'fun',
    description: 'Magic 8-ball',
    usage: '.8ball <question>',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      const q = (args || []).join(' ').trim();
      if (!q) return sock.sendMessage(chatId, { text: `Ask the 8-ball a yes/no question.\n.8ball <question>` }, { quoted: fake });
      const ans = (await raceApis([
        async () => { const r = await A('https://api.popcat.xyz/8ball'); return r.data?.answer || null; },
        async () => { const r = await A('https://yesno.wtf/api'); return r.data?.answer || null; },
      ])) || ['Yes', 'No', 'Maybe', 'Definitely', 'Ask again later'][Math.floor(Math.random() * 5)];
      return _send(sock, chatId, fake, ['🎱 *8-BALL*', '', `Q: ${q}`, `A: ${ans}`]);
    }
  },
  {
    name: 'bored',
    aliases: ['activity'],
    category: 'fun',
    description: 'Suggest something to do',
    usage: '.bored',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      const out = await raceApis([
        async () => { const r = await A('https://www.boredapi.com/api/activity'); return r.data?.activity || null; },
        async () => { const r = await A('https://bored-api.appbrewery.com/random'); return r.data?.activity || null; },
      ]);
      if (!out) return sock.sendMessage(chatId, { text: `❌ Can't think of anything.` }, { quoted: fake });
      return _send(sock, chatId, fake, ['🎯 *TRY THIS*', '', out]);
    }
  },
  {
    name: 'truth',
    category: 'fun',
    description: 'Truth question',
    usage: '.truth',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      const q = await raceApis([
        async () => { const r = await A('https://api.truthordarebot.xyz/api/truth'); return r.data?.question || null; },
      ]);
      if (!q) return sock.sendMessage(chatId, { text: `❌ Try again.` }, { quoted: fake });
      return _send(sock, chatId, fake, ['🤔 *TRUTH*', '', q]);
    }
  },
  {
    name: 'dare',
    category: 'fun',
    description: 'Dare challenge',
    usage: '.dare',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      const q = await raceApis([
        async () => { const r = await A('https://api.truthordarebot.xyz/api/dare'); return r.data?.question || null; },
      ]);
      if (!q) return sock.sendMessage(chatId, { text: `❌ Try again.` }, { quoted: fake });
      return _send(sock, chatId, fake, ['😈 *DARE*', '', q]);
    }
  },
];
