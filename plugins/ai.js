const axios = require('axios');
const { getBotName, createFakeContact, channelInfo } = require('../lib/messageConfig');
const { raceApis } = require('../lib/raceApi');

const _A = (url, opts = {}) => axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' }, ...opts });

module.exports = [
  // ============================
  // AI CHAT — race all providers in parallel for fastest reply
  // ============================
  {
    name: 'ai',
    aliases: ['chatgpt', 'gpt', 'ask'],
    category: 'ai',
    description: 'Ask the AI a question',
    usage: '.ai <question>',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const fake = createFakeContact(senderId);
      const question = args.join(' ').trim();
      if (!question) return sock.sendMessage(chatId, { text: `❌ Ask me anything!\n.ai <your question>` }, { quoted: fake });

      await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

      const q = encodeURIComponent(question);
      const answer = await raceApis([
        // PrexzyVilla GPT-5 API (working)
        async () => { const r = await _A(`https://apis.prexzyvilla.site/ai/gpt-5?text=${q}`); return r.data?.status ? (r.data?.text || null) : null; },
        // GiftedTech ChatGPT
        async () => { const r = await _A(`https://api.giftedtech.co.ke/api/ai/chatgpt?apikey=gifted&text=${q}`); return r.data?.result || null; },
        // GiftedTech GPT4
        async () => { const r = await _A(`https://api.giftedtech.co.ke/api/ai/gpt4?apikey=gifted&q=${q}`); return r.data?.result || null; },
        // BK9 OpenAI
        async () => { const r = await _A(`https://api.bk9.dev/ai/openai?q=${q}`); return r.data?.BK9 || r.data?.result || null; },
        // Siputzx GPT3
        async () => { const r = await _A(`https://api.siputzx.my.id/api/ai/gpt3?prompt=${q}&content=user`); return r.data?.data || null; },
      ], { perCallTimeoutMs: 18000 });

      if (!answer || typeof answer !== 'string' || !answer.trim()) {
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        return sock.sendMessage(chatId, { text: `❌ AI failed. Try again later.` }, { quoted: fake });
      }

      await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
      await sock.sendMessage(chatId, {
        text: `*Q:* ${question.substring(0, 100)}\n\n${answer}`,
        ...channelInfo
      }, { quoted: fake });
    }
  },

  // ============================
  // IMAGE GENERATION — race all providers; first valid PNG wins
  // ============================
  {
    name: 'imagine',
    aliases: ['dalle', 'dream', 'genimage'],
    category: 'ai',
    description: 'Generate AI image from prompt',
    usage: '.imagine <prompt>',
    execute: async (sock, message, args, context) => {
      const { chatId, senderId } = context;
      const botName = getBotName();
      const fake = createFakeContact(senderId);
      const prompt = args.join(' ').trim();
      if (!prompt) return sock.sendMessage(chatId, { text: `❌ Provide a prompt!\n.imagine <description>` }, { quoted: fake });

      await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

      const p = encodeURIComponent(prompt);
      const fetchBuf = async (url) => {
        try {
          const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 35000, headers: { 'User-Agent': 'Mozilla/5.0' } });
          const buf = Buffer.from(r.data);
          return buf.length > 5000 ? buf : null;
        } catch { return null; }
      };
      const fromJsonUrl = async (jsonUrl) => {
        try {
          const r = await _A(jsonUrl, { timeout: 35000 });
          const u = r.data?.result?.url || r.data?.result || r.data?.url || r.data?.image || r.data?.data?.url || null;
          if (!u || typeof u !== 'string' || !u.startsWith('http')) return null;
          return fetchBuf(u);
        } catch { return null; }
      };

      const imageBuf = await raceApis([
        // Pollinations (working, direct image)
        async () => fetchBuf(`https://image.pollinations.ai/prompt/${p}`),
        // GiftedTech Stable Diffusion
        async () => fromJsonUrl(`https://api.giftedtech.co.ke/api/ai/stablediffusion?apikey=gifted&prompt=${p}`),
        // Siputzx Stable Diffusion
        async () => fromJsonUrl(`https://api.siputzx.my.id/api/ai/stable-diffusion?prompt=${p}`),
        // BK9 image generation
        async () => fromJsonUrl(`https://api.bk9.dev/ai/image?prompt=${p}`),
      ], { perCallTimeoutMs: 40000 });

      if (!imageBuf) {
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        return sock.sendMessage(chatId, { text: `❌ Image generation failed. Try again later.` }, { quoted: fake });
      }

      await sock.sendMessage(chatId, {
        image: imageBuf,
        caption: `*${botName} AI Image*\n_${prompt}_`,
        ...channelInfo
      }, { quoted: fake });
      await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    }
  }
];