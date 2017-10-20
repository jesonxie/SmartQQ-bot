const qq = require('./qq');

let bot = qq.new();
bot.login((error) => {
  if (error) console.log(error);
  bot.initial();
});

bot.on('group_message', (e) => {
  console.log((e.send.card || e.send.markname || e.send.nick) + ':' + e.content);
});
