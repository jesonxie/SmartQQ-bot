const qq = require('./qq');

qq.login(() => {
  qq.getFriends();
});
