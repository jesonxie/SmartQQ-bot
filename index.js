const qq = require('./qq');

let bot = qq.new();
bot.login((error) => {
  if (error) console.log(error);
  bot.initial();
});

bot.on('group_message', (e) => {
  console.log((e.send.card || e.send.markname || e.send.nick) + ': ' + e.content + ' from: ' + e.from.name);
});

bot.on('message', (e) => {
  console.log((e.from.markname || e.from.nick) + ': ' + e.content);
  bot.sendBuddyMessage(e.from.uin, e.content);
});

bot.on('discuss_message', (e) => {
  console.log((e.send.markname || e.send.nick) + ' : ' + e.content + ' from ' + e.from.name);
});
