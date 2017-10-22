# SmartQQ-bot
对 SmartQQ 协议的封装，方便 QQ 机器人的开发

## 安装
```shell
npm install smartqqbot
```

## 快速开始
```javascript
const qq = require('smartqqbot');

let bot = qq.new();
// 登录
bot.login((error) => {
  if (error) console.log(error);
  // 初始化
  bot.initialize();
});

// 打印群消息
bot.on('group_message', (content, from, send) => {
  console.log((send.card || send.markname || send.nick) + ': ' + content + ' from: ' + from.name);
});

// 打印联系人消息并回复同样的内容
bot.on('message', (content, from, to) => {
  console.log((from.markname || from.nick) + ': ' + content);
  bot.sendBuddyMessage(from.uin, content);
});

// 打印讨论组消息
bot.on('discuss_message', (content, from, send) => {
  console.log((send.markname || send.nick) + ' : ' + content + ' from ' + from.name);
});

```

## API 说明
- [new()](#new)
  - [QQ 类](#QQ-类)
    - ['message' 事件](#message-事件)
    - ['group_message' 事件](#group_message-事件)
    - ['discuss_message' 事件](#discuss_message-事件)
    - [QQ.login([path, callback])](#qqloginpath-callback)
    - [QQ.initialize([callback])](#qqinitializecallback)
    - [QQ.sendBuddyMessage(uid, message[, option])](#qqsendbuddymessageuid-message-option)
    - [QQ.sendGroupMessage(gid, message[, option])](#qqsendgroupmessagegid-message-option)

### new()

- return: \<QQ>

返回一个新建的 QQ 实例

### QQ 类

#### 'message' 事件

- `content`\<String> 消息内容
- `from`\<Object> 消息来源
- `to`\<Object> 消息发往

收到联系人消息或者在其他客户端发送联系人消息时触发

#### 'group_message' 事件

- `content`\<String> 消息内容
- `from`\<Object> 消息来源（群）
- `send`\<Object> 消息发送人（联系人）

收到群消息或者在其他客户端发送群消息时触发

#### 'discuss_message' 事件

- `content`\<String> 消息内容
- `from`\<Object> 消息来源（讨论组）
- `send`\<Object> 消息发送人（联系人）

收到讨论组消息或者在其他客户端发送讨论组消息时触发

#### QQ.login([path, callback])

- `path`\<String> 二维码文件储存位置，默认为 `"qrcode.png"`
- `callback`\<Function>
  - `error`\<Error>
  
登录 QQ，需要手动打开二维码文件扫码

#### QQ.initialize([callback])

- `callback`\<Function>
  - `error`\<Error>
  
初始化 QQ，包括获取 QQ 群列表、联系人列表、讨论组列表和最近联系人列表

#### QQ.sendBuddyMessage(uid, message[, option])

- `uid`\<Number> 联系人 uid
- `message`\<String> 需发送的消息
- `option`\<Object>
  - `color`\<String> 字体颜色，默认为 `"000000"`
  - `name`\<String> 字体名，默认为 `"宋体"`
  - `size`\<String>|\<Number> 字体大小，默认为 `10`
  - `style`\<String> 字体样式，默认为 `[0, 0, 0]`

向联系人发送消息，其中 uid 非 QQ 号，需要从联系人列表中查询

#### QQ.sendGroupMessage(gid, message[, option])

- `gid`\<Number> 群 gid
- `message`\<String> 需发送的消息
- `option`\<Object>
  - `color`\<String> 字体颜色，默认为 `"000000"`
  - `name`\<String> 字体名，默认为 `"宋体"`
  - `size`\<String>|\<Number> 字体大小，默认为 `10`
  - `style`\<String> 字体样式，默认为 `[0, 0, 0]`

向群发送消息，其中 gid 非群号，需要从群列表中查询

#### QQ.sendDiscuMessage(did, message[, option])

- `did`\<Number> 群 did
- `message`\<String> 需发送的消息
- `option`\<Object>
  - `color`\<String> 字体颜色，默认为 `"000000"`
  - `name`\<String> 字体名，默认为 `"宋体"`
  - `size`\<String>|\<Number> 字体大小，默认为 `10`
  - `style`\<String> 字体样式，默认为 `[0, 0, 0]`

向讨论组发送消息，其中 did 非套讨论组号，需要从讨论组列表中查询

