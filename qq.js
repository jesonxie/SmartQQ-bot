const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const util = require('util');

// 登录状态
let logined = false;
let loginInfo = {};
let friends = {};

class Option {
  constructor(obj) {
    if(!obj.headers) obj.headers = {};
    Object.assign(obj.headers, basicHeaders);
    let cookies = {};
    CookieCan.forEach(({key, value, path, domain}, index, CookieCan) => {
      if(obj.hostname.indexOf(domain.replace('*', '')) != -1 &&
      obj.path.indexOf(path) != -1) {
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

/* jshint ignore:start */
function r(c) {
	return (c || "") + Math.round(2147483647 * (Math.random() || .5)) * +new Date % 1E10
}
/* jshint ignore:end */

const CookieCan = [];

CookieCan.push({
  'key': 'pgv_pvi',
  'value': r(),
  'path': '/',
  'domain': 'qq.com'
});

CookieCan.push({
  'key': 'pgv_si',
  'value': r('s'),
  'path': '/',
  'domain': 'qq.com'
});

CookieCan.push({
  'key': 'ptisp',
  'value': 'cnc',
  'path': '/',
  'domain': 'qq.com'
});

CookieCan.push({
  'key': 'RK',
  'value': 'jcnicGbKPg',
  'path': '/',
  'domain': 'qq.com'
});

// 对响应做基本的处理
let reciver = (callback) => (res) => {
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
      CookieCan.push(result);
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
        if (err) return console.log(err);
        res.data = buffer.toString();
        if (callback) callback(res, buffer);
      });
    } else {
      res.data = buffer.toString();
      if (callback) callback(res, buffer);
    }
  });
};

// 获取二维码
function getQrcode(callback) {
  let req = http.request(new Option({
    'method': 'GET',
    'hostname': 'ssl.ptlogin2.qq.com',
    'path': '/ptqrshow?appid=501004106&e=2&l=M&s=3&d=72&v=4&t=' + Math.random() + '&daid=164&pt_3rd_aid=0',
  }), reciver((res, buffer) => {
    confirmQRCodeState(callback);
    return fs.writeFile('qrcode.png', buffer, (err) => {
      if(err) return console.log(err);
      console.log('QRcode refresh');
    });
  }));

  req.end();
}

function confirmQRCodeState(callback) {
  let qrsig = CookieCan.qrsig;
  if (!qrsig) {
    for (let i = CookieCan.length - 1; i >= 0; i--) {
      if (CookieCan[i].key == 'qrsig') {
        qrsig = CookieCan[i].value;
      }
    }
  }
  let req = http.request(new Option({
    'method': 'GET',
    'hostname': 'ssl.ptlogin2.qq.com',
    'path': '/ptqrlogin?u1=http%3A%2F%2Fw.qq.com%2Fproxy.html&ptqrtoken=' + pt.hash33(pt.cookie.get(qrsig)) +
    '&ptredirect=0&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-' + Date.now() + '&js_ver=10230&js_type=1&login_sig=&pt_uistyle=40&aid=501004106&daid=164&mibao_css=m_webqq&',
  }), reciver((res, buffer) => {
    console.log(res.data);
    let state, url, describe, nickName;
    let result = /^ptuiCB\('(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)'\)/.exec(res.data);
    if (result) [, state, , url, , describe, nickName] = result;
    state = parseInt(state);
    if (state == 65) {
      getQrcode();
      return console.log(describe);
    }
    if (state == 0) {
      logined = true;
      console.log(describe);
      loginInfo = getQueryStringArgs(url);
      return callback ? callback(url) : undefined;
    }
    setTimeout(() => confirmQRCodeState(callback), 1000);
  }));

  req.end();
}

function getQueryStringArgs (url) {
    //获取查询字符串并去掉问号
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

const pt = {
  cookie: {
    get: function(t) {
      var e, i = function(t) {
        if (!t)
          return t;
        for (; t != unescape(t); )
          t = unescape(t);
        for (var e = ["<", ">", "'", '"', "%3c", "%3e", "%27", "%22", "%253c", "%253e", "%2527", "%2522"], i = ["<", ">", "'", '"', "%26%23x3c%3B", "%26%23x3e%3B", "%26%23x27%3B", "%26%23x22%3B", "%2526%2523x3c%253B", "%2526%2523x3e%253B", "%2526%2523x27%253B", "%2526%2523x22%253B"], n = 0; n < e.length; n++)
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


function login(callback) {
  new Promise((resolve, reject) => getQrcode(url => resolve(url)))
  .then((url) => new Promise((resolve, reject) => getPtwebqq(url, () => resolve())))
  .then(() => Promise.all([
    new Promise((resolve, reject) => getVfwebqq(() => resolve())),
    new Promise((resolve, reject) => login2(() => resolve())),
  ]))
  .then(() => {
    if (callback) callback();
  });
}

function getPtwebqq(url, callback) {
  let index = url.lastIndexOf('/');
  let path = url.slice(index);
  let req = http.request(new Option({
    'method': 'GET',
    'hostname': 'ptlogin2.web2.qq.com',
    'path': path,
    'headers': {
      'upgrade-insecure-requests': '1',
    }
  }), reciver((res, buffer) => {
    if (callback) callback();
  }));

  req.end();
}

function getVfwebqq(callback) {
  let req = http.request(new Option({
    'method': 'GET',
    'hostname': 's.web2.qq.com',
    'content-type': 'utf-8',
    'path': '/api/getvfwebqq?ptwebqq=&clientid=53999199&psessionid=&t=' + Date.now(),
    'headers': {
      'referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
      'connection': 'keep-alive'
    }
  }), reciver((res, buffer) => {
    let data = JSON.parse(res.data);
    loginInfo.vfwebqq = data.result.vfwebqq;
    if (callback) callback();
  }));

  req.end();
}

function login2(callback) {
  let req = http.request(new Option({
    'method': 'POST',
    'hostname': 'd1.web2.qq.com',
    'path': '/channel/login2',
    'content-type': 'application/x-www-form-urlencoded',
    'headers': {
      'Origin': 'http://d1.web2.qq.com',
      'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2'
    }
  }), reciver((res, buffer) => {
    let data = JSON.parse(res.data);
    loginInfo.uin = data.result.uin;
    loginInfo.psessionid = data.result.psessionid;
    console.log(data);
    if (callback) callback();
  }));

  req.write('r=%7B%22ptwebqq%22%3A%22%22%2C%22clientid%22%3A53999199%2C%22psessionid%22%3A%22%22%2C%22status%22%3A%22online%22%7D');
  req.end();
}

function getFriends() {
  let data = util.format('r={"vfwebqq":"%s","hash":"%s"}', loginInfo.vfwebqq, hash2(loginInfo.uin, ''));
  data = encodeURI(data);
  let req = http.request(new Option({
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
  }), reciver((res, buffer) => {
    let data = JSON.parse(res.data);
    friends = parseFriends(data.result);
  }));
  req.end(data);
}

/* jshint ignore:start */
hash2 = function(uin,ptvfwebqq){
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
/* jshint ignore:end */

exports.login = login;
Object.defineProperty(exports, 'logined', {
  get: () => logined
});
Object.defineProperty(exports, 'loginInfo', {
  get: () => loginInfo
});
exports.getFriends = getFriends;
