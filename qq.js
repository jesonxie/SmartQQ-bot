const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const util = require('util');
const EventEmitter = require('events');

class QQ extends EventEmitter{
  constructor(maxMassage = 1000, retryTime = 3000) {
    super();
    this.CookieCan = [];          // Cookie 罐
    this.logined = false;         // 登录状态
    this.loginInfo = {};          // 登录信息
    this.pollTime = 0;          // 心跳包队列
    this.friends = {};            // 好友列表
    this.friendsCategories = [];  // 好友分组
    this.groups = {};             // 群列表
    this.groupCategories = [];    // 群分组
    this.discusList = {};         // 讨论组列表
    this.recentList = [];         // 最近会话
    this.maxMassage = maxMassage; // 单会话最大消息数
    this.retryTime = retryTime;    // 错误重试时间
    this.self = {};               // 本人
    this.defaultStyle = {
      color: '000000',
      name: '宋体',
      size: '10',
      style: '[0, 0, 0]'
    };

    this.CookieCan.push({
      'key': 'pgv_pvi',
      'value': r(),
      'path': '/',
      'domain': 'qq.com'
    });

    this.CookieCan.push({
      'key': 'pgv_si',
      'value': r('s'),
      'path': '/',
      'domain': 'qq.com'
    });

    this.CookieCan.push({
      'key': 'ptisp',
      'value': 'cnc',
      'path': '/',
      'domain': 'qq.com'
    });

    this.CookieCan.push({
      'key': 'RK',
      'value': 'jcnicGbKPg',
      'path': '/',
      'domain': 'qq.com'
    });

    this.on('__message__', (next, message) => {
      if (!message.from.session) message.from.session = new Session(this, message.from);
      let e = new Message(this, message.content, message.from, message.send, message.to);
      message.from.session.append(e);
      this.emit(next, e);
    });

    this.sequence = 0;
    let t = (new Date()).getTime();
    t = (t - t % 1000) / 1000;
    t = t % 10000 * 10000;
    this.t = t;
  }

  //获取msgId
  getMsgId() {
    this.sequence ++;
    return this.t + this.sequence;
  }
  // 获取二维码
  getQrcode(path = 'qrcode.png', callback = handle) {
    let req = http.request(new Option(this, {
      'method': 'GET',
      'hostname': 'ssl.ptlogin2.qq.com',
      'path': '/ptqrshow?appid=501004106&e=2&l=M&s=3&d=72&v=4&t=' + Math.random() + '&daid=164&pt_3rd_aid=0',
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      this.confirmQRCodeState(path, callback);
      return fs.writeFile(path, buffer, (err) => {
        if(err) return console.log(err);
        console.log('二维码已刷新');
      });
    }));

    req.on('error', (error) => callback(error));
    req.end();
  }

  // 确认二维码状态
  confirmQRCodeState(path, callback = handle) {
    let qrsig = this.CookieCan.qrsig;
    if (!qrsig) {
      for (let i = this.CookieCan.length - 1; i >= 0; i--) {
        if (this.CookieCan[i].key == 'qrsig') {
          qrsig = this.CookieCan[i].value;
        }
      }
    }
    let req = http.request(new Option(this, {
      'method': 'GET',
      'hostname': 'ssl.ptlogin2.qq.com',
      'path': '/ptqrlogin?u1=http%3A%2F%2Fw.qq.com%2Fproxy.html&ptqrtoken=' + pt.hash33(pt.cookie.get(qrsig)) +
      '&ptredirect=0&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-' + Date.now() + '&js_ver=10230&js_type=1&login_sig=&pt_uistyle=40&aid=501004106&daid=164&mibao_css=m_webqq&',
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      let state, url, describe, nickName;
      let result = /^ptuiCB\('(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)'\)/.exec(res.data);
      if (result) [, state, , url, , describe, nickName] = result;
      state = parseInt(state);
      if (state == 65) {
        this.getQrcode(path);
        return console.log(describe);
      }
      if (state == 0) {
        this.logined = true;
        console.log(describe);
        this.loginInfo = getQueryStringArgs(url);
        this.loginInfo.nickName = nickName;
        return callback(null, url);
      }
      setTimeout(() => this.confirmQRCodeState(path, callback), 1000);
    }));

    req.on('error', (error) => callback(error));
    req.end();
  }

  // 登录
  login(path, callback = handle) {
    new Promise((resolve, reject) => this.getQrcode(path, (error, url) => {
      if (error) return reject(error);
      resolve(url);
    }))
    .then((url) => new Promise((resolve, reject) => this.getPtwebqq(url, (error) => {
      if (error) return reject(error);
      resolve();
    })))
    .then(() => Promise.all([
      new Promise((resolve, reject) => this.getVfwebqq((error) => {
        if (error) return reject(error);
        resolve();
      })),
      new Promise((resolve, reject) => this.login2((error) => {
        if (error) return reject(error);
        resolve();
      }))
    ]))
    .then(() => {
      callback(null);
    }, (error) => callback(error));
  }

  // 获取一系列登录相关 cookie
  getPtwebqq(url, callback = handle) {
    let index = url.lastIndexOf('/');
    let path = url.slice(index);
    let req = http.request(new Option(this, {
      'method': 'GET',
      'hostname': 'ptlogin2.web2.qq.com',
      'path': path,
      'headers': {
        'upgrade-insecure-requests': '1',
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      callback(null);
    }));

    req.on('error', (error) => callback(error));
    req.end();
  }

  // 获取 vfwebqq
  getVfwebqq(callback = handle) {
    let req = http.request(new Option(this, {
      'method': 'GET',
      'hostname': 's.web2.qq.com',
      'content-type': 'utf-8',
      'path': '/api/getvfwebqq?ptwebqq=&clientid=53999199&psessionid=&t=' + Date.now(),
      'headers': {
        'referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        'connection': 'keep-alive'
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      let data = JSON.parse(res.data);
      if (!data.result) return callback('vfwebqq 获取失败');
      this.loginInfo.vfwebqq = data.result.vfwebqq;
      callback();
    }));

    req.end();
  }

  login2(callback = handle) {
    let data = {
      "ptwebqq": "",
      "clientid": 53999199,
      "psessionid": "",
      "status": "online"
    };
    data = encodeURI('r=' + JSON.stringify(data));
    let req = http.request(new Option(this, {
      'method': 'POST',
      'hostname': 'd1.web2.qq.com',
      'path': '/channel/login2',
      'content-type': 'application/x-www-form-urlencoded',
      'headers': {
        'Origin': 'http://d1.web2.qq.com',
        'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
          'Content-Length': data.length
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      let data = JSON.parse(res.data);
      let uin = data.result.uin;
      this.loginInfo.uin = uin;
      this.loginInfo.psessionid = data.result.psessionid;
      callback();
    }));

    req.on('error', (error) => callback(error));
    req.end(data);
  }

  // 轮询获取消息并保持登录状态
  poll() {
    let data = {
      "ptwebqq": "",
      "clientid": 53999199,
      "psessionid": this.loginInfo.psessionid,
      "key": ""
    };
    data = encodeURI('r=' + JSON.stringify(data));
    let time = Date.now();
    this.pollTime = time;
    let req = http.request(new Option(this, {
      'method': 'POST',
      'hostname': 'd1.web2.qq.com',
      'path': '/channel/poll2',
      'headers': {
        'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
        'Origin': 'http://d1.web2.qq.com',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return console.log(error);
      let data;
      if (res.data) {
        data = JSON.parse(res.data.trim().replace(/(\n)|(\r)/im, (s, n) => n ? '\\n' : '\\r')).result;
        if (data && data[0]) this.reciveMessage(data);
      }
      if (this.pollTime == time) {
        return setTimeout(() => this.poll(), 0);
      }
    }));

    req.on('error', (error) => console.log(error));
    req.end(data);
  }

  initialize(callback = handle) {
    Promise.all([
      new Promise((resolve, reject) => this.getSelf((error) => {
        if (error) return reject(error);
        resolve();
      })),
      new Promise((resolve, reject) => this.getFriends((error) => {
        if (error) return reject(error);
        resolve();
      })),
      new Promise((resolve, reject) => this.getGroups((error) => {
        if (error) return reject(error);
        resolve();
      })),
      new Promise((resolve, reject) => this.getDiscuss((error) => {
        if (error) return reject(error);
        resolve();
      }))
    ])
    .then(() => {
      this.poll();
      return new Promise((resolve, reject) => this.getRecentList((error) => {
        if (error) return reject(error);
        resolve();
      }));
    })
    .then(() => {
      callback();
    }, (error) => callback(error));
  }

  getFriends(callback = handle) {
    let data = {
      "vfwebqq": this.loginInfo.vfwebqq,
      "hash": hash2(this.loginInfo.uin, '')
    };
    data = encodeURI('r=' + JSON.stringify(data));
    let req = http.request(new Option(this, {
      'method': 'POST',
      'hostname': 's.web2.qq.com',
      'path': '/api/get_user_friends2',
      'headers': {
        'referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        'origin': 'http://s.web2.qq.com',
        'connection': 'keep-alive',
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': data.length,
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      let data = JSON.parse(res.data);
      if (!data) {
        console.log('好友列表获取失败，正在重新获取');
        return setTimeout(() => this.getFriends(callback), this.retryTime);
      }
      this.parseFriendsData(data.result);
      if (callback) callback();
    }));

    req.on('error', (error) => callback(error));
    req.end(data);
  }

  getGroups(callback = handle) {
    let data = {
      "vfwebqq": this.loginInfo.vfwebqq,
      "hash": hash2(this.loginInfo.uin, '')
    };
    data = encodeURI('r=' + JSON.stringify(data));
    let req = http.request(new Option(this, {
      'method': 'POST',
      'hostname': 's.web2.qq.com',
      'path': '/api/get_group_name_list_mask2',
      'headers': {
        'referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        'origin': 'http://s.web2.qq.com',
        'connection': 'keep-alive',
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': data.length,
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      let data = JSON.parse(res.data);
      if (!data) {
        console.log('群列表获取失败，正在重新获取');
        return setTimeout(() => this.getGroups(callback), this.retryTime);
      }
      this.parseGroupData(data.result);
      if (callback) callback();
    }));

    req.on('error', (error) => callback(error));
    req.end(data);
  }

  getDiscuss(callback = handle) {
    let req = http.request(new Option(this, {
      'method': 'GET',
      'hostname': 's.web2.qq.com',
      'path': '/api/get_discus_list?clientid=53999199&psessionid=' + this.loginInfo.psessionid + '&vfwebqq=' + this.loginInfo.vfwebqq + '&t=' + Date.now(),
      'headers': {
        'referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        'origin': 'http://s.web2.qq.com',
        'connection': 'keep-alive',
        'content-type': 'utf-8',
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      let data = JSON.parse(res.data);
      if (!data) {
        console.log('讨论组列表获取失败，正在重新获取');
        return setTimeout(() => this.getDiscuss(callback), this.retryTime);
      }
      this.parseDiscussData(data.result);
      if (callback) callback();
    }));

    req.on('error', (error) => callback(error));
    req.end();
  }

  getSelf(callback = handle) {
    let req = http.request(new Option(this, {
      'method': 'GET',
      'hostname': 's.web2.qq.com',
      'path': '/api/get_self_info2?t=' + Date.now(),
      'headers': {
        'referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        'origin': 'http://s.web2.qq.com',
        'connection': 'keep-alive',
        'content-type': 'utf-8',
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      let data = JSON.parse(res.data);
      this.parseSelf(data.result);
      if (callback) callback();
    }));

    req.on('error', (error) => callback(error));
    req.end();
  }

  getGroupInfo(gid, callback = handle) {
    let req = http.request(new Option(this, {
      'method': 'GET',
      'hostname': 's.web2.qq.com',
      'path': '/api/get_group_info_ext2?gcode=' + this.groups[gid].code + '&vfwebqq=' + this.loginInfo.vfwebqq + '&t=' + Date.now(),
      'headers': {
        'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
        'Content-Type': 'utf-8',
        'Connection': 'keep-alive',
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      let data = JSON.parse(res.data.trim().replace(/(\n)|(\r)/im, (s, n) => n ? '\\n' : '\\r')).result;
      if (!data) {
        console.log('群信息获取失败，正在重新获取');
        return setTimeout(() => this.getGroupInfo(gid, callback), this.retryTime);
      }
      let group = this.groups[gid];
      Object.assign(group, data.ginfo);
      group.member = {};
      data.minfo.forEach((member, index, array) => {
        group.member[member.uin] = member;
        member.friend = this.friends[member.uin];
      });
      data.cards.forEach(({muin, card}, index, array) => {
        group.member[muin].card = card;
      });
    }));

    req.on('error', (error) => callback(error));
    req.end();
  }

  getDiscussInfo(did, callback = handle) {
    let req = http.request(new Option(this, {
      'method': 'GET',
      'hostname': 's.web2.qq.com',
      'path': '/channel/get_discu_info?did=' + did + '&vfwebqq=' + this.loginInfo.vfwebqq + '&clientid=53999199&psessionid=' + this.loginInfo.psessionid + '&t=' + Date.now(),
      'headers': {
        'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
        'Content-Type': 'utf-8',
        'Connection': 'keep-alive',
        'Content-Length': data.length
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      let data = JSON.parse(res.data.trim().replace(/(\n)|(\r)/im, (s, n) => n ? '\\n' : '\\r')).result;
      if (!data) {
        console('讨论组信息获取失败，正在重新获取');
        return setTimeout(() => this.getDiscussInfo(did, callback), this.retryTime);
      }
      let discuss = this.discusList[did];
      Object.assign(discuss, data.info);
      group.member = {};
      data.mem_info.forEach((member, index, array) => {
        discuss.member[member.uin] = member;
        member.friend = this.friends[member.uin];
        if (member.friend) member.markname = member.friend.markname;
      });
    }));

    req.on('error', (error) => callback(error));
    req.end();
  }

  getRecentList(callback = handle) {
    let data = {
      "vfwebqq": this.loginInfo.vfwebqq,
      "clientid": 53999199,
      "psessionid": this.loginInfo.psessionid
    };
    data = encodeURI('r=' + JSON.stringify(data));
    let req = http.request(new Option(this, {
      'method': 'POST',
      'hostname': 'd1.web2.qq.com',
      'path': '/channel/get_recent_list2',
      'headers': {
        'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
        'Origin': 'http://d1.web2.qq.com',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection': 'keep-alive',
        'Content-Length': data.length
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return callback(error);
      let data = JSON.parse(res.data).result;
      if (!data) {
        console.log('Recent list 获取失败，正在重新获取');
        return setTimeout(() => this.getRecentList(callback), this.retryTime);
      }
      data.forEach(({type, uin}, index, array) => {
        let target;
        switch (type) {
          case 0: target = this.friends[uin]; break;
          case 1: target = this.groups[uin]; break;
          case 2: target = this.discusList[uin]; break;
        }
        this.recentList.push(target);
      });
      callback();
    }));

    req.on('error', (error) => callback(error));
    req.end(data);
  }

  parseFriendsData({categories, friends: fris, info, marknames, vipinfo}) {
    categories.forEach((catg, index, array) => (this.friendsCategories[catg.sort] = catg));
    fris.forEach((friend, index, array) => (this.friends[friend.uin] = new Friend(this, friend.uin, friend.categories)));
    marknames.forEach((markname, index, array) => this.friends[markname.uin].markname = markname.markname);
  }

  parseGroupData({gnamelist}) {
    gnamelist.forEach((group, index, array) => this.groups[group.gid] = new Group(this, group.gid, group.code, group.name));
  }

  parseDiscussData({dnamelist}) {
    dnamelist.forEach((discuss, index, array) => this.discusList[discuss.did] = new Discuss(this, discuss.did, discuss.name));
  }

  parseSelf(data) {
    let self = this.friends[data.uin] = new Friend(this, data.uin, 0);
    this.self = self;
    self.markname = '我';
    self.isSelf = true;
    Object.assign(this.loginInfo, data);
  }

  reciveMessage(data) {
    if (!data) return;
    data.forEach(({poll_type, value: message}, index, array) => {
      message.style = message.content.shift();
      message.content = message.content.join(' ');
      switch (poll_type) {
        case 'group_message':
          message.from = this.groups[message.from_uin];
          message.to = this.friends[message.to_uin];
          if (!message.from.member) {
            return new Promise((resolve, reject) => this.getGroupInfo(message.from.gid, (error) => {
              if (error) return reject(error);
              message.send = this.groups[message.from_uin].member[message.send_uin];
              let e = new Message(this, message.content, message.from, message.send, message.to);
              this.emit('__message__', 'group_message', message);
            }));
          }
          message.send = this.groups[message.from_uin].member[message.send_uin];
          let e = new Message(this, message.content, message.from, message.send, message.to);
          this.emit('__message__', 'group_message', message);
          break;
        case 'dicuss_message':
          message.from = this.discusList[message.from_uin];
          message.to = this.friends[message.to_uin];
          if (!message.from.member) {
            return new Promise((resolve, reject) => this.getDiscussInfo(message.from.did, (error) => {
              if (error) return reject(error);
              message.send = message.from.member[message.send_uin];
              this.emit('__message__', 'discuss_message', message);
            }));
          }
          message.send = message.from.member[message.send_uin];
          this.emit('__message__', 'discuss_message', message);
          break;
        case 'message':
          message.from = this.friends[message.from_uin];
          message.to = this.friends[message.to_uin];
          this.emit('__message__', 'message', message);
          break;
      }
    });
  }

  sendBuddyMessage(uin, message, {color = '000000', name = '宋体', size = '10', style = '[0, 0, 0]'} = this.defaultStyle) {
    let target = this.friends[uin];
    if (!target.session) target.session = new Session(this, target);
    target.session.append(new Message(this, message, self, self, target));
    let data = {
      "to": uin,
      "content":"[\"" + message + "\",[\"font\",{\"name\":\"" + name + "\",\"size\":" + size + ",\"style\":" + style + ",\"color\":\"" + color + "\"}]]",
      "face": this.loginInfo.face,
      "clientid": 53999199,
      "msg_id": this.getMsgId(),
      "psessionid": this.loginInfo.psessionid
    };
    data = encodeURI('r=' + JSON.stringify(data));

    let req = http.request(new Option(this, {
      'method': 'POST',
      'hostname': 'd1.web2.qq.com',
      'path': '/channel/send_buddy_msg2',
      'headers': {
        'Referer': 'http://d1.web2.qq.com/cfproxy.html?v=20151105001&callback=1',
        'Origin': 'http://d1.web2.qq.com',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection': 'keep-alive',
        'Content-Length': data.length
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return console.log(error);
      let data;
      if (res.data) {
        data = JSON.parse(res.data.trim().replace(/(\n)|(\r)/im, (s, n) => n ? '\\n' : '\\r')).result;
        if (data && data[0]) this.reciveMessage(data);
      }
      return setTimeout(() => this.poll(), 0);
    }));

    req.on('error', (error) => {
      setTimeout(() => this.poll(), 0);
    });
    req.end(data);
  }

  sendGroupMessage(gid, message, {color = '000000', name = '宋体', size = '10', style = '[0, 0, 0]'} = this.defaultStyle) {
    let target = this.groups[gid];
    if (!target.session) target.session = new Session(this, target);
    target.session.append(new Message(this, message, target, self, self));
    let data = {
      "group_uin": gid,
      "content":"[\"" + message + "\",[\"font\",{\"name\":\"" + name + "\",\"size\":" + size + ",\"style\":" + style + ",\"color\":\"" + color + "\"}]]",
      "face": this.loginInfo.face,
      "clientid": 53999199,
      "msg_id": this.getMsgId(),
      "psessionid": this.loginInfo.psessionid
    };
    data = encodeURI('r=' + JSON.stringify(data));

    let req = http.request(new Option(this, {
      'method': 'POST',
      'hostname': 'd1.web2.qq.com',
      'path': '/channel/send_qun_msg2',
      'headers': {
        'Referer': 'http://d1.web2.qq.com/cfproxy.html?v=20151105001&callback=1',
        'Origin': 'http://d1.web2.qq.com',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection': 'keep-alive',
        'Content-Length': data.length
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return console.log(error);
      let data;
      if (res.data) {
        data = JSON.parse(res.data.trim().replace(/(\n)|(\r)/im, (s, n) => n ? '\\n' : '\\r')).result;
        if (data && data[0]) this.reciveMessage(data);
      }
      return setTimeout(() => this.poll(), 0);
    }));

    req.on('error', (error) => callback(error));
    req.end(data);
  }

  sendDiscussMessage(did, message, {color = '000000', name = '宋体', size = '10', style = '[0, 0, 0]'} = this.defaultStyle) {
    let target = this.discusList[did];
    if (!target.session) target.session = new Session(this, target);
    target.session.append(new Message(this, message, target, self, self));
    let data = {
      "did": did,
      "content":"[\"" + message + "\",[\"font\",{\"name\":\"" + name + "\",\"size\":" + size + ",\"style\":" + style + ",\"color\":\"" + color + "\"}]]",
      "face": this.loginInfo.face,
      "clientid": 53999199,
      "msg_id": this.getMsgId(),
      "psessionid": this.loginInfo.psessionid
    };
    data = encodeURI('r=' + JSON.stringify(data));
    let req = http.request(new Option(this, {
      'method': 'POST',
      'hostname': 'd1.web2.qq.com',
      'path': '/channel/send_discu_msg2',
      'headers': {
        'Referer': 'http://d1.web2.qq.com/cfproxy.html?v=20151105001&callback=1',
        'Origin': 'http://d1.web2.qq.com',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection': 'keep-alive',
        'Content-Length': data.length
      }
    }), reciver(this, (error, res, buffer) => {
      if (error) return console.log(error);
      let data;
      if (res.data) {
      data = JSON.parse(res.data.trim().replace(/(\n)|(\r)/im, (s, n) => n ? '\\n' : '\\r')).result;
        if (data && data[0]) this.reciveMessage(data);
      }
      return setTimeout(() => this.poll(), 0);
    }));

    req.on('error', (error) => callback(error));
    req.end(data);
  }
}

class Friend {
  constructor(self, uin, categories) {
    this.uin = uin;
    this.categories = self.friendsCategories[categories];
    this.possessor = self;
  }

  send(message, style) {
    this.possessor.sendBuddyMessage(this.uin, message, style);
  }
}

class Group {
  constructor(self, gid, code, name) {
    this.possessor = self;
    this.gid = gid;
    this.name = name;
    this.code = code;
  }

  getInfo(callback) {
    this.possessor.getGroupInfo(this.gid, callback);
  }

  send(message, style) {
    this.possessor.sendGroupMessage(this.gid, message, style);
  }
}

class Discuss {
  constructor(self, did, name) {
    this.did = did;
    this.possessor = self;
    this.name = name;
  }

  getInfo(callback) {
    this.possessor.getDiscussInfo(this.did, callback);
  }

  send(message, style) {
    this.possessor.sendDiscussMessage(this.did, message, style);
  }
}

class Session {
  constructor(self, target) {
    this.possessor = self;
    this.target = target;
    this.messages = [];
  }

  append(message) {
    this.messages.push(message);
    this.possessor.messages.push(this);
    if (this.messages.length > this.possessor.maxMassage) {
      this.clear(1);
    }
  }

  clear(num = this.messages.length) {
    this.messages.splice(0, num);
  }
}

class Message {
  constructor(self, content, from, send, to) {
    this.possessor = self;
    this.content = content;
    this.from = from;
    this.send = send;
    this.to = to;
    this.time = Date.now();
    if (!from.session) {
      from.session = new Session(self, from);
    }
    (this.from.isSelf ? this.to : this.from).session.append(this);
  }

  reply(message, style) {
    this.from.send(message, style);
  }
}

// 公用函数
class Option {
  constructor(context, obj) {
    if(!obj.headers) obj.headers = {};
    Object.assign(obj.headers, basicHeaders);
    let cookies = {};
    context.CookieCan.forEach(({key, value, path, domain}, index, CookieCan) => {
      if(obj.hostname.endsWith(domain.trim('*')) && obj.path.startsWith(path)) {
        if (cookies[key] && cookies[key].domain.length > domain.length) return;
        if (key == 'airkey') return;
        cookies[key] = {key, value, path, domain};
      }
    });
    for (let key in cookies) {
      obj.headers.cookie += key + '=' + cookies[key].value + '; ';
    }
    obj.headers.cookie = obj.headers.cookie.slice(0, -1);
    return obj;
  }
}

const basicHeaders = {
  'cookie': '',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate',
  'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.6,en;q=0.4,zh-CN;q=0.2',
};

// 对响应做基本的处理
let reciver = (context, callback = handle) => (res) => {
  let setCookies = res.headers['set-cookie'];
  // set cookie
  if (setCookies) {
    for (let i = 0; i < setCookies.length; i++) {
      let result = {};
      let args = setCookies[i].split(';');
      let index = args[0].indexOf('=');
      args[0] = args[0].trim();
      if (index != -1) {
        result.key = args[0].slice(0, index);
        result.value = args[0].slice(index + 1);
      } else {
        result.key = args[0];
        result.value = '';
      }
      for (let i = 1; i < args.length; i++) {
        args[i] = args[i].trim();
        let index = args[i].indexOf('=');
        if (index == -1) continue;
        result[args[i].slice(0, index).toLowerCase()] = args[i].slice(index + 1);
      }
      if (!result.domain) result.domain = res.client._host;
      if (!result.path) result.path = '/';
      context.CookieCan.push(result);
    }
  }

  let chunks = [];
  let size = 0;

  res.on('data', (buffer) => {
    chunks.push(buffer);
    size += buffer.length;
  });

  res.on('end', () => {
    buffer = Buffer.concat(chunks, size);

    if (res.headers['content-encoding'] == 'gzip') {
      zlib.unzip(buffer, (err, buffer) => {
        if (err) return callback(err);
        res.data = buffer.toString();
        callback(null, res, buffer);
      });
    } else {
      res.data = buffer.toString();
      callback(null, res, buffer);
    }
  });
};

function getQueryStringArgs (url) {
    let index = url.indexOf('?');
    if (!index) return;
    let qs = url.slice(index + 1);
    //初始化变量
    let args = {},
        items = qs.length ? qs.split("&") : [],
        item = null,
        name = null,
        value = null,
        i = 0,
        len = items.length;
    //对每一项参数添加到 args 中作为 args 的属性
    for (i=0; i < len; i++) {
        item = items[i].split("=");
        name = decodeURIComponent(item[0]);
        value = decodeURIComponent(item[1]);
        if (name.length) {
            args[name] = value;
        }
    }
    return args;
}

function handle(error) {
  if (error) console.log(error);
}

// 以下代码复制或修改自 WebQQ 前端代码
/* jshint ignore:start */
var hash2 = function(uin,ptvfwebqq){
    uin += "";
    var ptb = [];
    for (var i=0;i<ptvfwebqq.length;i++){
        var ptbIndex = i%4;
        ptb[ptbIndex] ^= ptvfwebqq.charCodeAt(i);
    }
    var salt = ["EC", "OK"];
    var uinByte = [];
    uinByte[0] = (((uin >> 24) & 0xFF) ^ salt[0].charCodeAt(0));
    uinByte[1] = (((uin >> 16) & 0xFF) ^ salt[0].charCodeAt(1));
    uinByte[2] = (((uin >> 8) & 0xFF) ^ salt[1].charCodeAt(0));
    uinByte[3] = ((uin & 0xFF) ^ salt[1].charCodeAt(1));
    var result = [];
    for (var i=0;i<8;i++){
        if (i%2 == 0)
            result[i] = ptb[i>>1];
        else
            result[i] = uinByte[i>>1];
    }
    return byte2hex(result);
};

var byte2hex = function(bytes){//bytes array
    var hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
    var buf = "";

    for (var i=0;i<bytes.length;i++){
        buf += (hex[(bytes[i]>>4) & 0xF]);
        buf += (hex[bytes[i] & 0xF]);
    }
    return buf;
}

const pt = {
  cookie: {
    get: function(t) {
      var e, i = function(t) {
        if (!t)
          return t;
        for (; t != unescape(t); )
          t = unescape(t);
        for (var e = ["<", ">", "'", '"', "%3c", "%3e", "%27", "%22", "%253c", "%253e", "%2527", "%2522"],
                 i = ["<", ">", "'", '"', "%26%23x3c%3B", "%26%23x3e%3B", "%26%23x27%3B", "%26%23x22%3B", "%2526%2523x3c%253B", "%2526%2523x3e%253B", "%2526%2523x27%253B", "%2526%2523x22%253B"],
                 n = 0; n < e.length; n++)
          t = t.replace(new RegExp(e[n],"gi"), i[n]);
        return t;
      };
      return i(unescape(t));
    }
  },
  hash33: function(t) {
    for (var e = 0, i = 0, n = t.length; n > i; ++i)
      e += (e << 5) + t.charCodeAt(i);
    return 2147483647 & e;
  }
};

function r(c) {
	return (c || "") + Math.round(2147483647 * (Math.random() || .5)) * +new Date % 1E10
}

/* jshint ignore:end */
module.exports = QQ;
