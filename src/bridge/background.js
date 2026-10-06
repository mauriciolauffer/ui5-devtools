// background.js - Manages messaging between DevTools panels and content scripts
const ports = {};

chrome.runtime.onConnect.addListener((port) => {
  let tabId;

  port.onMessage.addListener((message) => {
    if (message.name === 'init' && message.tabId) {
      tabId = message.tabId;
      ports[tabId] = port;
      return;
    }

    if (tabId && ports[tabId]) {
      chrome.tabs.sendMessage(tabId, message);
    }
  });

  port.onDisconnect.addListener(() => {
    if (tabId && ports[tabId]) {
      delete ports[tabId];
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.tab && sender.tab.id && ports[sender.tab.id]) {
    ports[sender.tab.id].postMessage(message);
  }
});
