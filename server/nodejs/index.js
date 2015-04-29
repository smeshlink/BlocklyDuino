var
  os = require('os'),
  path = require('path'),
  fs = require('fs'),
  http = require('http'),
  express = require('express'),
  bodyParser = require('body-parser'),
  WebSocketServer = require('ws').Server,
  serialPort = require('serialport'),
  cp = require('child_process'),
  iconv = require('iconv-lite'),

  /* port to listen */
  port = process.env.PORT || 8080,

  /* path of arduino executable, i.e. arduino.exe on win */
  arduinoPath = process.env.ARDUINOPATH || '',

  /* dir for sketch and build files */
  dataDir = path.join(os.tmpdir(), 'BlocklyDuino'),
  
  webRoot = __dirname + '/../../',

  /* supported arduino boards */
  boards = {
    'Arduino UNO': 'arduino:avr:uno'
  },
  
  /* header of auth key */
  authKeyHeader = 'X-BlocklyDuino-Key',

  /* set of authed keys */
  keys = {};

fs.mkdir(dataDir, function(err) { /* ignore if exists */ });

function run(key, board, port, code) {
  var buildId = 'build' + key.id,
    sketchId = 'sketch' + key.id,
    buildPath = path.join(dataDir, buildId),
    sketchPath = path.join(dataDir, sketchId);
  
  function build() {
    if (!arduinoPath) {
      broadcast(key, 'errorln', 'Arduino path is not set!');
      return;
    }
    
    var args = [ '-v', '--buildpath', buildPath ];
    
    if (board in boards) {
      args.push('--board');
      args.push(boards[board]);
    }
    
    if (port) {
      args.push('--upload');
      args.push('--port');
      args.push(port);
      console.log("Uploading %s on port %s.", sketchId, port);
    } else {
      args.push('--verify');
      console.log("Verifying %s.", sketchId);
    }
    
    args.push(sketchPath);
    
    var p = cp.spawn(arduinoPath, args);
    p.on('error', function(err) {
      console.log(err);
      broadcast(key, 'errorln', err);
    });
    p.stdout.on('data', function(data) {
      broadcast(key, 'log', data);
    });
    p.stderr.on('data', function(data) {
      broadcast(key, 'error', data);
    });
  }
  
  function mkBuildPath(err) {
    fs.mkdir(buildPath, build);
  }
  
  function saveIno(err) {
    sketchPath = path.join(sketchPath, sketchId + '.ino');
    fs.writeFile(sketchPath, code, mkBuildPath);
  }
  
  function mkSketchPath() {
    fs.mkdir(sketchPath, saveIno);
  }
  
  mkSketchPath();
}

function broadcast(key, level, msg) {
  var ws = key.ws;
  if (ws) {
    ws.send(JSON.stringify({
      level: level,
      msg: Buffer.isBuffer(msg) ? iconv.decode(msg, 'GBK') : msg.toString()
    }));
  }
}

function auth(req, res, next) {
  var key = req.get(authKeyHeader);
  if (key != null && key in keys
    && keys[key].ip == req.ip) {
    next();
  } else {
    res.status(403).end();
  }
}

var app = express();
app.use(bodyParser.json());
app.use(express.static(webRoot));

/* Generate auth keys for clients */
app.get('/api/auth', function(req, res) {
  var key = Math.round(Math.random() * 1000000);
  console.log('Generate key %d for %s.', key, req.ip);
  keys[key] = { id: key, ip: req.ip };
  res.send({ key: key });
});

/* Get supported boards */
app.get('/api/boards', function(req, res) {
  res.send(Object.keys(boards));
});

/* Get available ports */
app.get('/api/ports', function(req, res) {
  serialPort.list(function (err, ports) {
    res.send(ports.map(function(port) { return port.comName; }));
  });
});

/* Run some code */
app.post('/api/run', auth, function(req, res) {
  var key = keys[req.get(authKeyHeader)], body = req.body;
  run(key, body.board, body.port, body.code);
  res.end();
});

var server = http.createServer(app);
server.listen(port);
console.log('Listening on %d', port);

var wss = new WebSocketServer({ server: server });
wss.on('connection', function(ws) {
  ws.on('message', function incoming(message) {
    var data = JSON.parse(message);
    if ('key' in data && data.key in keys) {
      keys[data.key].ws = ws;
      console.log('Accept connection for key %s', data.key);
    }
  });
  
  ws.on('close', function close() {
    for (var k in keys) {
      if (keys[k].ws === ws) {
        keys[k].ws = null;
        console.log('Drop connection for key %s', k);
      }
    }
  });
});

cp.exec('start http://localhost:' + port + '/app/');