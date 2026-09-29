var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var path = require('path');
var fs = require('fs');
var os = require('os');
var util = require('./utils/util.js');
var config = require('./configs/configForja.js');
var auth = require('./utils/auth.js');
var mail = require('./utils/mail.js');
var Store = require('./utils/store.js');

var host = os.hostname().toLowerCase();
var port = config.port;
var scriptName = path.basename(__filename).split('.').slice(0, -1).join('.');
var dataDir = path.join(__dirname, 'data');
var store = new Store(dataDir, config);
store.ensure();

var app = express();
// Reflect request Origin so localhost and public tunnels both work.
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(bodyParser.json());

function sendError(res, status, detailed) {
  res
    .contentType('application/json')
    .status(status)
    .send(
      JSON.stringify({
        status: status,
        message: 'Error',
        detailed_message: detailed || 'Internal server error',
      })
    );
}

function sendOk(res, data) {
  res.contentType('application/json').status(200).send(JSON.stringify(data));
}

function isStaff(user) {
  return user && (user.rol === 'entrenador' || user.rol === 'superusuario');
}

function getBearerToken(req) {
  var h = req.get('Authorization') || '';
  if (h.toLowerCase().indexOf('bearer ') === 0) {
    return h.slice(7).trim();
  }
  return h.trim() || null;
}

function requireAuth(req, res, next) {
  var token = getBearerToken(req);
  if (!token) {
    sendError(res, 401, 'No autorizado');
    return;
  }
  var sessions = store.readSessions();
  var session = sessions[token];
  if (!session) {
    sendError(res, 401, 'Sesión inválida o caducada');
    return;
  }
  var user = store.findUserById(session.userId);
  if (!user) {
    sendError(res, 401, 'Usuario no encontrado');
    return;
  }
  if (user.status !== 'valido') {
    sendError(res, 403, 'Tu cuenta está pendiente de que el box la valide.');
    return;
  }
  req.token = token;
  req.currentUser = user;
  next();
}

function requireStaff(req, res, next) {
  requireAuth(req, res, function () {
    if (!isStaff(req.currentUser)) {
      sendError(res, 403, 'Solo entrenadores o superusuarios');
      return;
    }
    next();
  });
}

function requireSuper(req, res, next) {
  requireAuth(req, res, function () {
    if (req.currentUser.rol !== 'superusuario') {
      sendError(res, 403, 'Solo superusuario');
      return;
    }
    next();
  });
}

app.get('/status', function (req, res) {
  res.contentType('application/json').status(200).send('OK');
});

// POST /auth — estilo COSTES (conexionURL + 'auth')
app.post('/auth', function (req, res) {
  try {
    var username = (req.body && (req.body.usuario || req.body.username || req.body.user)) || '';
    var password = (req.body && req.body.password) || '';
    if (!username || !password) {
      sendError(res, 400, 'Usuario y contraseña son obligatorios');
      return;
    }
    var user = store.findUserByLogin(username);
    if (!user || !auth.verifyPassword(password, user.passwordHash)) {
      util.grabarLog(
        'logrest',
        'Auth',
        scriptName,
        host,
        port,
        util.getIPCliente(req),
        req.protocol,
        req.method,
        req.get('host'),
        req.originalUrl,
        401,
        'Llamada a la API',
        'Auth NO correcto [user: ' + username + ']'
      );
      sendError(res, 401, 'Usuario o contraseña incorrectos');
      return;
    }
    if (!user.emailVerified) {
      sendError(res, 403, 'Debes verificar tu email antes de iniciar sesión.');
      return;
    }
    if (user.status === 'pendiente') {
      sendError(res, 403, 'Tu cuenta está pendiente de que el box la valide.');
      return;
    }
    if (user.status === 'rechazado') {
      sendError(res, 403, 'Tu registro ha sido rechazado por el box.');
      return;
    }
    if (user.status !== 'valido') {
      sendError(res, 403, 'Tu cuenta no está activa.');
      return;
    }

    var token = auth.createToken();
    var sessions = store.readSessions();
    sessions[token] = { userId: user.id, createdAt: new Date().toISOString() };
    store.writeSessions(sessions);

    util.grabarLog(
      'logrest',
      'Auth',
      scriptName,
      host,
      port,
      util.getIPCliente(req),
      req.protocol,
      req.method,
      req.get('host'),
      req.originalUrl,
      200,
      'Llamada a la API',
      'Auth correcto [user: ' + username + ']'
    );

    sendOk(res, {
      logged: 1,
      access_token: token,
      token_type: 'Bearer',
      user: store.publicUser(user),
    });
  } catch (error) {
    sendError(res, 500, error.message || 'Internal server error');
  }
});

app.post('/logout', requireAuth, function (req, res) {
  var sessions = store.readSessions();
  delete sessions[req.token];
  store.writeSessions(sessions);
  sendOk(res, { ok: true });
});

app.post('/register', function (req, res) {
  try {
    var b = req.body || {};
    var required = ['nombre', 'apellidos', 'fechaNacimiento', 'email', 'password', 'telefono', 'nivel'];
    for (var i = 0; i < required.length; i++) {
      if (!b[required[i]]) {
        sendError(res, 400, 'Falta el campo: ' + required[i]);
        return;
      }
    }
    if (!b.emergenciaNombre || !b.emergenciaTelefono) {
      sendError(res, 400, 'Contacto de emergencia (nombre y teléfono) obligatorio');
      return;
    }
    var niveles = ['nunca he hecho CrossFit', 'algo de experiencia', 'entreno habitual'];
    if (niveles.indexOf(b.nivel) === -1) {
      sendError(res, 400, 'Nivel no válido');
      return;
    }
    var email = String(b.email).trim().toLowerCase();
    if (store.findUserByLogin(email)) {
      sendError(res, 409, 'Ya existe un usuario con ese email');
      return;
    }
    var usuario = email;
    if (b.usuario) {
      usuario = String(b.usuario).trim().toLowerCase();
      if (store.findUserByLogin(usuario)) {
        sendError(res, 409, 'Ya existe ese nombre de usuario');
        return;
      }
    }

    var user = {
      id: 'u-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      usuario: usuario,
      nombre: String(b.nombre).trim(),
      apellidos: String(b.apellidos).trim(),
      fechaNacimiento: b.fechaNacimiento,
      email: email,
      passwordHash: auth.hashPassword(b.password),
      telefono: String(b.telefono).trim(),
      emergenciaNombre: String(b.emergenciaNombre).trim(),
      emergenciaTelefono: String(b.emergenciaTelefono).trim(),
      nivel: b.nivel,
      rol: 'atleta',
      status: 'pendiente',
      emailVerified: false,
      rms: Store.emptyRms(),
      logros: [],
      createdAt: new Date().toISOString(),
    };
    store.saveUser(user);

    var code = auth.generateCode();
    var codes = store.readCodes();
    codes[email] = {
      code: code,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };
    store.writeCodes(codes);

    mail.sendVerificationEmail(config.smtp, email, code, config.boxName).then(function (mailResult) {
      var payload = {
        ok: true,
        email: email,
        emailSent: !!mailResult.sent,
        message:
          'Registro creado. Revisa tu email para el código de verificación. Tras verificar, un entrenador debe validar tu cuenta.',
      };
      if (config.devShowCode) {
        payload.devCode = code;
        payload.devHint = 'En local el código es ' + code;
      }
      if (!mailResult.sent && mailResult.reason) {
        payload.mailNote = mailResult.reason;
      }
      sendOk(res, payload);
    });
  } catch (error) {
    sendError(res, 500, error.message || 'Internal server error');
  }
});

app.post('/verify-email', function (req, res) {
  try {
    var email = String((req.body && req.body.email) || '')
      .trim()
      .toLowerCase();
    var code = String((req.body && req.body.code) || '').trim();
    if (!email || !code) {
      sendError(res, 400, 'Email y código obligatorios');
      return;
    }
    var codes = store.readCodes();
    var entry = codes[email];
    if (!entry || entry.code !== code) {
      sendError(res, 400, 'Código incorrecto o caducado');
      return;
    }
    var user = store.findUserById(entry.userId);
    if (!user) {
      sendError(res, 404, 'Usuario no encontrado');
      return;
    }
    user.emailVerified = true;
    user.status = 'pendiente';
    store.saveUser(user);
    delete codes[email];
    store.writeCodes(codes);
    sendOk(res, {
      ok: true,
      message:
        'Email verificado. Tu cuenta está pendiente de que el box la valide. No podrás iniciar sesión hasta entonces.',
      user: store.publicUser(user),
    });
  } catch (error) {
    sendError(res, 500, error.message || 'Internal server error');
  }
});

app.get('/me', requireAuth, function (req, res) {
  sendOk(res, { user: store.publicUser(req.currentUser) });
});

app.put('/me', requireAuth, function (req, res) {
  try {
    var b = req.body || {};
    var user = req.currentUser;
    if (b.nombre !== undefined) user.nombre = String(b.nombre).trim();
    if (b.apellidos !== undefined) user.apellidos = String(b.apellidos).trim();
    if (b.telefono !== undefined) user.telefono = String(b.telefono).trim();
    if (b.emergenciaNombre !== undefined) user.emergenciaNombre = String(b.emergenciaNombre).trim();
    if (b.emergenciaTelefono !== undefined) {
      user.emergenciaTelefono = String(b.emergenciaTelefono).trim();
    }
    if (b.email !== undefined) {
      var newEmail = String(b.email).trim().toLowerCase();
      var other = store.findUserByLogin(newEmail);
      if (other && other.id !== user.id) {
        sendError(res, 409, 'Ese email ya está en uso');
        return;
      }
      user.email = newEmail;
    }
    if (b.password) {
      user.passwordHash = auth.hashPassword(b.password);
    }
    // Atleta no puede cambiar rol ni status
    store.saveUser(user);
    sendOk(res, { ok: true, user: store.publicUser(user) });
  } catch (error) {
    sendError(res, 500, error.message || 'Internal server error');
  }
});

app.get('/users/pending', requireStaff, function (req, res) {
  var list = store
    .readUsers()
    .filter(function (u) {
      return u.emailVerified && u.status === 'pendiente';
    })
    .map(function (u) {
      return store.publicUser(u);
    });
  sendOk(res, { users: list });
});

app.get('/users/athletes', requireStaff, function (req, res) {
  var list = store
    .readUsers()
    .filter(function (u) {
      return u.rol === 'atleta' && u.status === 'valido';
    })
    .map(function (u) {
      return store.publicUser(u);
    });
  sendOk(res, { users: list });
});

app.get('/users', requireStaff, function (req, res) {
  var list = store.readUsers().map(function (u) {
    return store.publicUser(u);
  });
  sendOk(res, { users: list });
});

app.post('/users/:id/approve', requireStaff, function (req, res) {
  var user = store.findUserById(req.params.id);
  if (!user) {
    sendError(res, 404, 'Usuario no encontrado');
    return;
  }
  user.status = 'valido';
  store.saveUser(user);
  sendOk(res, { ok: true, user: store.publicUser(user) });
});

app.post('/users/:id/reject', requireStaff, function (req, res) {
  var user = store.findUserById(req.params.id);
  if (!user) {
    sendError(res, 404, 'Usuario no encontrado');
    return;
  }
  user.status = 'rechazado';
  store.saveUser(user);
  sendOk(res, { ok: true, user: store.publicUser(user) });
});

// Superusuario: crear / promover entrenadores
app.post('/coaches', requireSuper, function (req, res) {
  try {
    var b = req.body || {};
    if (b.userId) {
      var existing = store.findUserById(b.userId);
      if (!existing) {
        sendError(res, 404, 'Usuario no encontrado');
        return;
      }
      existing.rol = 'entrenador';
      existing.status = 'valido';
      existing.emailVerified = true;
      store.saveUser(existing);
      sendOk(res, { ok: true, user: store.publicUser(existing) });
      return;
    }
    if (!b.usuario || !b.password || !b.nombre || !b.email) {
      sendError(res, 400, 'usuario, password, nombre y email obligatorios');
      return;
    }
    var login = String(b.usuario).trim().toLowerCase();
    var email = String(b.email).trim().toLowerCase();
    if (store.findUserByLogin(login) || store.findUserByLogin(email)) {
      sendError(res, 409, 'Usuario o email ya existe');
      return;
    }
    var coach = {
      id: 'u-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      usuario: login,
      nombre: String(b.nombre).trim(),
      apellidos: String(b.apellidos || '').trim(),
      fechaNacimiento: b.fechaNacimiento || '1990-01-01',
      email: email,
      passwordHash: auth.hashPassword(b.password),
      telefono: String(b.telefono || '').trim(),
      emergenciaNombre: '',
      emergenciaTelefono: '',
      nivel: 'entreno habitual',
      rol: 'entrenador',
      status: 'valido',
      emailVerified: true,
      rms: Store.emptyRms(),
      logros: [],
      createdAt: new Date().toISOString(),
    };
    store.saveUser(coach);
    sendOk(res, { ok: true, user: store.publicUser(coach) });
  } catch (error) {
    sendError(res, 500, error.message || 'Internal server error');
  }
});

function resolveTargetUser(req, res) {
  var targetId = req.query.userId || (req.body && req.body.userId) || req.params.userId;
  if (targetId && targetId !== req.currentUser.id) {
    if (!isStaff(req.currentUser)) {
      sendError(res, 403, 'No puedes ver datos de otro atleta');
      return null;
    }
    var other = store.findUserById(targetId);
    if (!other) {
      sendError(res, 404, 'Usuario no encontrado');
      return null;
    }
    return other;
  }
  return req.currentUser;
}

app.get('/logros', requireAuth, function (req, res) {
  var target = resolveTargetUser(req, res);
  if (!target) return;
  sendOk(res, { userId: target.id, logros: target.logros || [] });
});

app.post('/logros', requireStaff, function (req, res) {
  var b = req.body || {};
  if (!b.userId || !b.nombre) {
    sendError(res, 400, 'userId y nombre obligatorios');
    return;
  }
  var target = store.findUserById(b.userId);
  if (!target) {
    sendError(res, 404, 'Usuario no encontrado');
    return;
  }
  if (!target.logros) target.logros = [];
  var logro = {
    id: 'l-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    nombre: String(b.nombre).trim(),
    descripcion: String(b.descripcion || '').trim(),
    fecha: b.fecha || new Date().toISOString().slice(0, 10),
  };
  target.logros.push(logro);
  store.saveUser(target);
  sendOk(res, { ok: true, logro: logro, logros: target.logros });
});

app.delete('/logros/:logroId', requireStaff, function (req, res) {
  var userId = req.query.userId || (req.body && req.body.userId);
  if (!userId) {
    sendError(res, 400, 'userId obligatorio');
    return;
  }
  var target = store.findUserById(userId);
  if (!target) {
    sendError(res, 404, 'Usuario no encontrado');
    return;
  }
  target.logros = (target.logros || []).filter(function (l) {
    return l.id !== req.params.logroId;
  });
  store.saveUser(target);
  sendOk(res, { ok: true, logros: target.logros });
});

app.get('/rm', requireAuth, function (req, res) {
  var target = resolveTargetUser(req, res);
  if (!target) return;
  sendOk(res, { userId: target.id, rms: target.rms || Store.emptyRms(), lifts: Store.LIFTS });
});

app.put('/rm', requireAuth, function (req, res) {
  var b = req.body || {};
  var targetId = b.userId || req.currentUser.id;
  var target;
  if (targetId !== req.currentUser.id) {
    if (!isStaff(req.currentUser)) {
      sendError(res, 403, 'No puedes editar RM de otro atleta');
      return;
    }
    target = store.findUserById(targetId);
  } else {
    target = req.currentUser;
  }
  if (!target) {
    sendError(res, 404, 'Usuario no encontrado');
    return;
  }
  if (!target.rms) target.rms = Store.emptyRms();
  var rmsIn = b.rms || b;
  Store.LIFTS.forEach(function (lift) {
    if (rmsIn[lift] !== undefined) {
      var val = rmsIn[lift];
      if (val === null || val === '' || val === undefined) {
        target.rms[lift] = null;
      } else {
        var n = Number(val);
        if (!isNaN(n) && n >= 0) {
          target.rms[lift] = Math.round(n * 2) / 2;
        }
      }
    }
  });
  store.saveUser(target);
  sendOk(res, { ok: true, userId: target.id, rms: target.rms });
});

app.get('/calendar', requireAuth, function (req, res) {
  var cal = store.readCalendar();
  var year = req.query.year ? Number(req.query.year) : null;
  var month = req.query.month ? Number(req.query.month) : null;
  if (year && month) {
    var prefix = year + '-' + String(month).padStart(2, '0');
    var filtered = {};
    Object.keys(cal).forEach(function (d) {
      if (d.indexOf(prefix) === 0) {
        filtered[d] = cal[d];
      }
    });
    sendOk(res, { workouts: filtered, year: year, month: month });
    return;
  }
  sendOk(res, { workouts: cal });
});

app.get('/calendar/:date', requireAuth, function (req, res) {
  var cal = store.readCalendar();
  var date = req.params.date;
  sendOk(res, { date: date, workout: cal[date] || null });
});

app.put('/calendar/:date', requireStaff, function (req, res) {
  var date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    sendError(res, 400, 'Fecha inválida (YYYY-MM-DD)');
    return;
  }
  var b = req.body || {};
  var cal = store.readCalendar();
  cal[date] = {
    title: String(b.title || '').trim(),
    description: String(b.description || '').trim(),
    updatedBy: req.currentUser.id,
    updatedAt: new Date().toISOString(),
  };
  store.writeCalendar(cal);
  sendOk(res, { ok: true, date: date, workout: cal[date] });
});

app.delete('/calendar/:date', requireStaff, function (req, res) {
  var cal = store.readCalendar();
  delete cal[req.params.date];
  store.writeCalendar(cal);
  sendOk(res, { ok: true });
});

// Serve Angular production build (same origin as API).
var webDist = path.join(__dirname, '..', 'webforja', 'dist', 'webforja');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', function (req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    // Do not swallow API-looking paths without a file; hash routing SPA fallback.
    res.sendFile(path.join(webDist, 'index.html'), function (err) {
      if (err) next();
    });
  });
} else {
  console.warn('Angular build not found at ' + webDist + ' — run: npm run build --prefix webforja');
}

app.listen(port, '0.0.0.0', function () {
  console.log('TRNN BULL CrossFit listening at http://127.0.0.1:' + port);
  console.log('SQLite: ' + path.join(dataDir, 'trnnbull.db'));
  console.log('Seed / import users: superusuario/super123 , entrenador/coach123');
});
