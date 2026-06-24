'use strict';
const { getSetting, updateSetting } = require('./database');
const { getBotName, createFakeContact } = require('./messageConfig');

const typingIntervals = new Map();

function stopAllTypingIntervals() {
  for (const [chatId, interval] of typingIntervals) {
    clearInterval(interval);
    typingIntervals.delete(chatId);
  }
}

function isAutorecordingApplicableForChat(chatId) {
  try { return require('./autorecording').isAutorecordingApplicableForChat(chatId); } catch { return false; }
}

function isAutotypingEnabled() {
  const cfg = getSetting('autotyping', null);
  if (!cfg || typeof cfg !== 'object') return false;
  return cfg.enabled === true;
}

function isAutotypingApplicableForChat(chatId) {
  const cfg = getSetting('autotyping', null);
  if (!cfg?.enabled) return false;
  const isGroup = chatId.endsWith('@g.us');
  if (isGroup && !cfg.group) return false;
  if (!isGroup && !cfg.pm) return false;
  return true;
}

async function handleAutotypingForMessage(sock, chatId) {
  try {
    if (!isAutotypingApplicableForChat(chatId)) return;
    if (isAutorecordingApplicableForChat(chatId)) return;

    if (typingIntervals.has(chatId)) return;

    try { await sock.presenceSubscribe(chatId); } catch {}
    await sock.sendPresenceUpdate('composing', chatId);

    const interval = setInterval(async () => {
      try { await sock.sendPresenceUpdate('composing', chatId); } catch { clearInterval(interval); typingIntervals.delete(chatId); }
    }, 4000);
    typingIntervals.set(chatId, interval);

    setTimeout(async () => {
      clearInterval(typingIntervals.get(chatId));
      typingIntervals.delete(chatId);
      try { await sock.sendPresenceUpdate('paused', chatId); } catch {}
    }, 25000);
  } catch {}
}

module.exports = { isAutotypingEnabled, handleAutotypingForMessage, isAutotypingApplicableForChat, stopAllTypingIntervals };
