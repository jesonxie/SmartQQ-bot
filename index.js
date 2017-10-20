const qq = require('./qq');

let bot = qq.new();
bot.login(() => {
  bot.initial();
});

bot.on('message', (e) => {
  console.log((e.from.markname || e.from.nick) + ':' + e.content);
});
