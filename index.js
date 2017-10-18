const qq = require('./qq');

let bot = qq.new();
bot.login(() => {
  bot.initial();
});
