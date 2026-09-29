var fs = require('fs');
var path = require('path');
var { DatabaseSync } = require('node:sqlite');
var auth = require('./auth.js');

var LIFTS = [
  'backSquat',
  'frontSquat',
  'overheadSquat',
  'deadlift',
  'clean',
  'snatch',
  'cleanAndJerk',
  'benchPress',
  'strictPress',
  'pushPress',
  'thruster',
];

function emptyRms() {
  var rms = {};
  LIFTS.forEach(function (k) {
    rms[k] = null;
  });
  return rms;
}

function Store(dataDir, config) {
  this.dataDir = dataDir;
  this.config = config;
  this.dbPath = path.join(dataDir, 'trnnbull.db');
  this.usersPath = path.join(dataDir, 'users.json');
  this.sessionsPath = path.join(dataDir, 'sessions.json');
  this.codesPath = path.join(dataDir, 'verificationCodes.json');
  this.calendarPath = path.join(dataDir, 'calendar.json');
  this.db = null;
}

Store.prototype.ensure = function () {
  if (!fs.existsSync(this.dataDir)) {
    fs.mkdirSync(this.dataDir, { recursive: true });
  }
  this.db = new DatabaseSync(this.dbPath);
  this.db.exec('PRAGMA foreign_keys = ON;');
  this.createTables();
  var userCount = this.db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    if (this.hasJsonData()) {
      this.importFromJson();
    } else {
      this.seedUsers();
    }
  }
};

Store.prototype.createTables = function () {
  this.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      usuario TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      apellidos TEXT NOT NULL DEFAULT '',
      fechaNacimiento TEXT,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      telefono TEXT DEFAULT '',
      emergenciaNombre TEXT DEFAULT '',
      emergenciaTelefono TEXT DEFAULT '',
      nivel TEXT DEFAULT '',
      rol TEXT NOT NULL,
      status TEXT NOT NULL,
      emailVerified INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS verification_codes (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS calendar_wods (
      date TEXT PRIMARY KEY,
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      updatedBy TEXT,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS rms (
      userId TEXT NOT NULL,
      lift TEXT NOT NULL,
      value REAL,
      PRIMARY KEY (userId, lift),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS logros (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT DEFAULT '',
      fecha TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
};

Store.prototype.hasJsonData = function () {
  try {
    if (!fs.existsSync(this.usersPath)) return false;
    var users = JSON.parse(fs.readFileSync(this.usersPath, 'utf8'));
    return Array.isArray(users) && users.length > 0;
  } catch (e) {
    return false;
  }
};

Store.prototype.readJsonFile = function (filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return fallback;
  }
};

Store.prototype.importFromJson = function () {
  var users = this.readJsonFile(this.usersPath, []);
  var sessions = this.readJsonFile(this.sessionsPath, {});
  var codes = this.readJsonFile(this.codesPath, {});
  var calendar = this.readJsonFile(this.calendarPath, {});
  var self = this;

  var insertUser = this.db.prepare(`
    INSERT INTO users (
      id, usuario, nombre, apellidos, fechaNacimiento, email, passwordHash,
      telefono, emergenciaNombre, emergenciaTelefono, nivel, rol, status,
      emailVerified, createdAt
    ) VALUES (
      @id, @usuario, @nombre, @apellidos, @fechaNacimiento, @email, @passwordHash,
      @telefono, @emergenciaNombre, @emergenciaTelefono, @nivel, @rol, @status,
      @emailVerified, @createdAt
    )
  `);
  var insertRm = this.db.prepare(
    'INSERT OR REPLACE INTO rms (userId, lift, value) VALUES (@userId, @lift, @value)'
  );
  var insertLogro = this.db.prepare(
    'INSERT INTO logros (id, userId, nombre, descripcion, fecha) VALUES (@id, @userId, @nombre, @descripcion, @fecha)'
  );

  this.db.exec('BEGIN');
  try {
    users.forEach(function (u) {
      insertUser.run({
        id: u.id,
        usuario: u.usuario,
        nombre: u.nombre,
        apellidos: u.apellidos || '',
        fechaNacimiento: u.fechaNacimiento || null,
        email: u.email,
        passwordHash: u.passwordHash,
        telefono: u.telefono || '',
        emergenciaNombre: u.emergenciaNombre || '',
        emergenciaTelefono: u.emergenciaTelefono || '',
        nivel: u.nivel || '',
        rol: u.rol,
        status: u.status,
        emailVerified: u.emailVerified ? 1 : 0,
        createdAt: u.createdAt || new Date().toISOString(),
      });
      var rms = u.rms || emptyRms();
      LIFTS.forEach(function (lift) {
        var val = rms[lift];
        insertRm.run({
          userId: u.id,
          lift: lift,
          value: val === null || val === undefined || val === '' ? null : Number(val),
        });
      });
      (u.logros || []).forEach(function (l) {
        insertLogro.run({
          id: l.id,
          userId: u.id,
          nombre: l.nombre,
          descripcion: l.descripcion || '',
          fecha: l.fecha || null,
        });
      });
    });

    var insertSession = self.db.prepare(
      'INSERT OR REPLACE INTO sessions (token, userId, createdAt) VALUES (@token, @userId, @createdAt)'
    );
    Object.keys(sessions || {}).forEach(function (token) {
      var s = sessions[token];
      if (s && s.userId) {
        insertSession.run({
          token: token,
          userId: s.userId,
          createdAt: s.createdAt || new Date().toISOString(),
        });
      }
    });

    var insertCode = self.db.prepare(
      'INSERT OR REPLACE INTO verification_codes (email, code, userId, createdAt) VALUES (@email, @code, @userId, @createdAt)'
    );
    Object.keys(codes || {}).forEach(function (email) {
      var c = codes[email];
      if (c && c.code) {
        insertCode.run({
          email: email,
          code: c.code,
          userId: c.userId,
          createdAt: c.createdAt || new Date().toISOString(),
        });
      }
    });

    var insertCal = self.db.prepare(
      'INSERT OR REPLACE INTO calendar_wods (date, title, description, updatedBy, updatedAt) VALUES (@date, @title, @description, @updatedBy, @updatedAt)'
    );
    Object.keys(calendar || {}).forEach(function (date) {
      var w = calendar[date];
      insertCal.run({
        date: date,
        title: (w && w.title) || '',
        description: (w && w.description) || '',
        updatedBy: (w && w.updatedBy) || null,
        updatedAt: (w && w.updatedAt) || null,
      });
    });

    this.db.exec('COMMIT');
    console.log('SQLite: imported existing JSON data into ' + this.dbPath);
  } catch (e) {
    this.db.exec('ROLLBACK');
    throw e;
  }
};

Store.prototype.seedUsers = function () {
  var seeds = this.buildSeedUsers();
  var self = this;
  seeds.forEach(function (u) {
    self.saveUser(u);
  });
  console.log('SQLite: seeded superusuario/super123 and entrenador/coach123');
};

Store.prototype.buildSeedUsers = function () {
  var seeds = this.config.seedUsers || [];
  var now = new Date().toISOString();
  return seeds.map(function (s, idx) {
    return {
      id: 'seed-' + (idx + 1),
      usuario: s.usuario,
      nombre: s.nombre,
      apellidos: s.apellidos,
      fechaNacimiento: s.fechaNacimiento || '1990-01-01',
      email: s.email,
      passwordHash: auth.hashPassword(s.password),
      telefono: s.telefono || '',
      emergenciaNombre: s.emergenciaNombre || '',
      emergenciaTelefono: s.emergenciaTelefono || '',
      nivel: s.nivel || 'entreno habitual',
      rol: s.rol,
      status: s.status || 'valido',
      emailVerified: s.emailVerified !== false,
      rms: emptyRms(),
      logros: [],
      createdAt: now,
    };
  });
};

Store.prototype.rowToUser = function (row) {
  if (!row) return null;
  return {
    id: row.id,
    usuario: row.usuario,
    nombre: row.nombre,
    apellidos: row.apellidos,
    fechaNacimiento: row.fechaNacimiento,
    email: row.email,
    passwordHash: row.passwordHash,
    telefono: row.telefono,
    emergenciaNombre: row.emergenciaNombre,
    emergenciaTelefono: row.emergenciaTelefono,
    nivel: row.nivel,
    rol: row.rol,
    status: row.status,
    emailVerified: !!row.emailVerified,
    rms: this.loadRms(row.id),
    logros: this.loadLogros(row.id),
    createdAt: row.createdAt,
  };
};

Store.prototype.loadRms = function (userId) {
  var rms = emptyRms();
  var rows = this.db.prepare('SELECT lift, value FROM rms WHERE userId = ?').all(userId);
  rows.forEach(function (r) {
    if (Object.prototype.hasOwnProperty.call(rms, r.lift)) {
      rms[r.lift] = r.value === null || r.value === undefined ? null : r.value;
    }
  });
  return rms;
};

Store.prototype.loadLogros = function (userId) {
  return this.db
    .prepare('SELECT id, nombre, descripcion, fecha FROM logros WHERE userId = ? ORDER BY fecha, id')
    .all(userId)
    .map(function (l) {
      return {
        id: l.id,
        nombre: l.nombre,
        descripcion: l.descripcion || '',
        fecha: l.fecha,
      };
    });
};

Store.prototype.saveRms = function (userId, rms) {
  var stmt = this.db.prepare(
    'INSERT OR REPLACE INTO rms (userId, lift, value) VALUES (@userId, @lift, @value)'
  );
  var data = rms || emptyRms();
  LIFTS.forEach(function (lift) {
    var val = data[lift];
    stmt.run({
      userId: userId,
      lift: lift,
      value: val === null || val === undefined || val === '' ? null : Number(val),
    });
  });
};

Store.prototype.saveLogros = function (userId, logros) {
  this.db.prepare('DELETE FROM logros WHERE userId = ?').run(userId);
  var stmt = this.db.prepare(
    'INSERT INTO logros (id, userId, nombre, descripcion, fecha) VALUES (@id, @userId, @nombre, @descripcion, @fecha)'
  );
  (logros || []).forEach(function (l) {
    stmt.run({
      id: l.id,
      userId: userId,
      nombre: l.nombre,
      descripcion: l.descripcion || '',
      fecha: l.fecha || null,
    });
  });
};

Store.prototype.readUsers = function () {
  var self = this;
  return this.db
    .prepare('SELECT * FROM users ORDER BY createdAt')
    .all()
    .map(function (row) {
      return self.rowToUser(row);
    });
};

Store.prototype.findUser = function (predicate) {
  var users = this.readUsers();
  for (var i = 0; i < users.length; i++) {
    if (predicate(users[i])) {
      return users[i];
    }
  }
  return null;
};

Store.prototype.findUserById = function (id) {
  var row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return this.rowToUser(row);
};

Store.prototype.findUserByLogin = function (login) {
  var key = String(login || '')
    .trim()
    .toLowerCase();
  var row = this.db
    .prepare(
      'SELECT * FROM users WHERE lower(usuario) = ? OR lower(email) = ? LIMIT 1'
    )
    .get(key, key);
  return this.rowToUser(row);
};

Store.prototype.saveUser = function (user) {
  var existing = this.db.prepare('SELECT id FROM users WHERE id = ?').get(user.id);
  if (existing) {
    this.db
      .prepare(
        `UPDATE users SET
          usuario = @usuario,
          nombre = @nombre,
          apellidos = @apellidos,
          fechaNacimiento = @fechaNacimiento,
          email = @email,
          passwordHash = @passwordHash,
          telefono = @telefono,
          emergenciaNombre = @emergenciaNombre,
          emergenciaTelefono = @emergenciaTelefono,
          nivel = @nivel,
          rol = @rol,
          status = @status,
          emailVerified = @emailVerified,
          createdAt = @createdAt
        WHERE id = @id`
      )
      .run({
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        apellidos: user.apellidos || '',
        fechaNacimiento: user.fechaNacimiento || null,
        email: user.email,
        passwordHash: user.passwordHash,
        telefono: user.telefono || '',
        emergenciaNombre: user.emergenciaNombre || '',
        emergenciaTelefono: user.emergenciaTelefono || '',
        nivel: user.nivel || '',
        rol: user.rol,
        status: user.status,
        emailVerified: user.emailVerified ? 1 : 0,
        createdAt: user.createdAt || new Date().toISOString(),
      });
  } else {
    this.db
      .prepare(
        `INSERT INTO users (
          id, usuario, nombre, apellidos, fechaNacimiento, email, passwordHash,
          telefono, emergenciaNombre, emergenciaTelefono, nivel, rol, status,
          emailVerified, createdAt
        ) VALUES (
          @id, @usuario, @nombre, @apellidos, @fechaNacimiento, @email, @passwordHash,
          @telefono, @emergenciaNombre, @emergenciaTelefono, @nivel, @rol, @status,
          @emailVerified, @createdAt
        )`
      )
      .run({
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        apellidos: user.apellidos || '',
        fechaNacimiento: user.fechaNacimiento || null,
        email: user.email,
        passwordHash: user.passwordHash,
        telefono: user.telefono || '',
        emergenciaNombre: user.emergenciaNombre || '',
        emergenciaTelefono: user.emergenciaTelefono || '',
        nivel: user.nivel || '',
        rol: user.rol,
        status: user.status,
        emailVerified: user.emailVerified ? 1 : 0,
        createdAt: user.createdAt || new Date().toISOString(),
      });
  }
  this.saveRms(user.id, user.rms || emptyRms());
  this.saveLogros(user.id, user.logros || []);
  return user;
};

Store.prototype.readSessions = function () {
  var rows = this.db.prepare('SELECT token, userId, createdAt FROM sessions').all();
  var out = {};
  rows.forEach(function (r) {
    out[r.token] = { userId: r.userId, createdAt: r.createdAt };
  });
  return out;
};

Store.prototype.writeSessions = function (sessions) {
  this.db.exec('BEGIN');
  try {
    this.db.prepare('DELETE FROM sessions').run();
    var stmt = this.db.prepare(
      'INSERT INTO sessions (token, userId, createdAt) VALUES (@token, @userId, @createdAt)'
    );
    Object.keys(sessions || {}).forEach(function (token) {
      var s = sessions[token];
      if (s && s.userId) {
        stmt.run({
          token: token,
          userId: s.userId,
          createdAt: s.createdAt || new Date().toISOString(),
        });
      }
    });
    this.db.exec('COMMIT');
  } catch (e) {
    this.db.exec('ROLLBACK');
    throw e;
  }
};

Store.prototype.readCodes = function () {
  var rows = this.db
    .prepare('SELECT email, code, userId, createdAt FROM verification_codes')
    .all();
  var out = {};
  rows.forEach(function (r) {
    out[r.email] = { code: r.code, userId: r.userId, createdAt: r.createdAt };
  });
  return out;
};

Store.prototype.writeCodes = function (codes) {
  this.db.exec('BEGIN');
  try {
    this.db.prepare('DELETE FROM verification_codes').run();
    var stmt = this.db.prepare(
      'INSERT INTO verification_codes (email, code, userId, createdAt) VALUES (@email, @code, @userId, @createdAt)'
    );
    Object.keys(codes || {}).forEach(function (email) {
      var c = codes[email];
      if (c && c.code) {
        stmt.run({
          email: email,
          code: c.code,
          userId: c.userId,
          createdAt: c.createdAt || new Date().toISOString(),
        });
      }
    });
    this.db.exec('COMMIT');
  } catch (e) {
    this.db.exec('ROLLBACK');
    throw e;
  }
};

Store.prototype.readCalendar = function () {
  var rows = this.db
    .prepare('SELECT date, title, description, updatedBy, updatedAt FROM calendar_wods')
    .all();
  var out = {};
  rows.forEach(function (r) {
    out[r.date] = {
      title: r.title || '',
      description: r.description || '',
      updatedBy: r.updatedBy,
      updatedAt: r.updatedAt,
    };
  });
  return out;
};

Store.prototype.writeCalendar = function (cal) {
  this.db.exec('BEGIN');
  try {
    this.db.prepare('DELETE FROM calendar_wods').run();
    var stmt = this.db.prepare(
      'INSERT INTO calendar_wods (date, title, description, updatedBy, updatedAt) VALUES (@date, @title, @description, @updatedBy, @updatedAt)'
    );
    Object.keys(cal || {}).forEach(function (date) {
      var w = cal[date];
      stmt.run({
        date: date,
        title: (w && w.title) || '',
        description: (w && w.description) || '',
        updatedBy: (w && w.updatedBy) || null,
        updatedAt: (w && w.updatedAt) || null,
      });
    });
    this.db.exec('COMMIT');
  } catch (e) {
    this.db.exec('ROLLBACK');
    throw e;
  }
};

Store.prototype.publicUser = function (user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    usuario: user.usuario,
    nombre: user.nombre,
    apellidos: user.apellidos,
    fechaNacimiento: user.fechaNacimiento,
    email: user.email,
    telefono: user.telefono,
    emergenciaNombre: user.emergenciaNombre,
    emergenciaTelefono: user.emergenciaTelefono,
    nivel: user.nivel,
    rol: user.rol,
    status: user.status,
    emailVerified: user.emailVerified,
    rms: user.rms || emptyRms(),
    logros: user.logros || [],
    createdAt: user.createdAt,
  };
};

Store.LIFTS = LIFTS;
Store.emptyRms = emptyRms;

module.exports = Store;
