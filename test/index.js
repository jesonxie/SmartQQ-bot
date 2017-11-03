const qq = require('../qq');

let bot = new qq();
bot.login('qrcode.png', (error) => {
  if (error) console.log(error);
  bot.initialize();
});

bot.on('group_message', (message) => {
  console.log((message.send.card || message.send.markname || message.send.nick) + ': ' + message.content + ' from: ' + message.from.name);
});

bot.on('message', (message) => {
  console.log((message.from.markname || message.from.nick) + ': ' + message.content);
});

bot.on('discuss_message', (content, from, send) => {
  console.log((message.send.markname || message.send.nick) + ' : ' + message.content + ' from ' + message.from.name);
});
