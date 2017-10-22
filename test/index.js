const qq = require('../qq');

let bot = qq.new();
bot.login((error) => {
  if (error) console.log(error);
  bot.initialize();
});

bot.on('group_message', (content, from, send) => {
  console.log((send.card || send.markname || send.nick) + ': ' + content + ' from: ' + from.name);
});

bot.on('message', (content, from, to) => {
  console.log((from.markname || from.nick) + ': ' + content);
  bot.sendBuddyMessage(from.uin, content);
});

bot.on('discuss_message', (content, from, send) => {
  console.log((send.markname || send.nick) + ' : ' + content + ' from ' + from.name);
});
