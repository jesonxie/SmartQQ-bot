const http = require('http');
const zlib = require('zlib');
const fs = require('fs');

let logined = false;

class Option {
  constructor(obj) {
    if(!obj.headers) obj.headers = {};
    Object.assign(obj.headers, basicHeaders);
    for (let key in CookieCan) {
      if (CookieCan.hasOwnProperty(key)) {
        if(obj.hostname.indexOf(CookieCan[key].domain.replace('*', '')) != -1 &&
           obj.path.indexOf(CookieCan[key].path) != -1) obj.headers.cookie += key + '=' + CookieCan[key].value + ';';
      }
    }
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

const CookieCan = {};

let reciver = (callback) => (res) => {
  let setCookies = res.headers['set-cookie'];
  // set cookie
  if (setCookies) {
    for (let i = 0; i < setCookies.length; i++) {
      let result = /^(.*?)=(.*?);\s*(?:EXPIRES=(.*?);)?\s*(?:PATH=(.*?);)?\s*(?:DOMAIN=(.*?);)?\s*(HttpOnly)?$/i.exec(setCookies[i]);
      let [, key, value, , path, domain] = result;
      CookieCan[key] = {key, value, path, domain};
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

    if(res.headers['content-cncoding'] == 'gzip') {
      zlib.unzip(buffer, (err, buffer) => {
        if (err) return console.log(err);
        res.data = buffer.toString();
        callback(res, buffer);
      });
    } else {
      res.data = buffer.toString();
      callback(res, buffer);
    }
  });
};


function getQrcode() {
  let req = http.request(new Option({
    'method': 'GET',
    'hostname': 'ssl.ptlogin2.qq.com',
    'path': '/ptqrshow?appid=501004106&e=2&l=M&s=3&d=72&v=4&t=' + Math.random() + '&daid=164&pt_3rd_aid=0',
  }), reciver((res) => {
    if (res.headers['content-type'] == 'image/png') {
      return fs.writeFile('qrcode.png', buffer, (err) => {
        if(err) console.log(err);
        console.log('QRcode geted');
      });
    }

    console.log(res.data);
  }));

  req.end();
}

function confirmLoginState() {
  let qrsig = CookieCan.qrsig;
  qrsig = qrsig ?  qrsig.value : 0;
  let req = http.request(new Option({
    'method': 'GET',
    'hostname': 'ssl.ptlogin2.qq.com',
    'path': '/ptqrlogin?u1=http%3A%2F%2Fw.qq.com%2Fproxy.html&ptqrtoken=' + pt.hash33(pt.cookie.get(qrsig)) +
    '&ptredirect=0&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-' + Date.now() + '&js_ver=10230&js_type=1&login_sig=&pt_uistyle=40&aid=501004106&daid=164&mibao_css=m_webqq&',
  }), reciver((res, buffer) => {
    console.log(res.data);
    let state, url, describe, nickName;
    let result = /^ptuiCB\('(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)'\);$/.exec(res.data);
    if (result) [, state, , url, , describe, nickName] = result;
    state = parseInt(state);
    if (state == 65) {
      getQrcode();
      console.log(describe);
    }
    if (state == 0) {
      logined = true;
      console.log(describe);
    }
  }));
  if (!logined) setTimeout(confirmLoginState, 1000);

  req.end();
}

pt = {
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

getQrcode();
confirmLoginState();
