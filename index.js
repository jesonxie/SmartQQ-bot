const qq = require('./qq');

qq.login(() => {
  qq.getFriends(() => console.log(qq.friends));
});
