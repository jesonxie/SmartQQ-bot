const qq = require('./qq');

qq.login((url) => {
  qq.getFriends();
});
