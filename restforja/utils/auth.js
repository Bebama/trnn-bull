var crypto = require('crypto');

function hashPassword(password) {
  var salt = crypto.randomBytes(16).toString('hex');
  var hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  if (!stored || stored.indexOf(':') === -1) {
    return false;
  }
  var parts = stored.split(':');
  var salt = parts[0];
  var expected = parts[1];
  var actual = crypto.scryptSync(String(password), salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
  } catch (e) {
    return false;
  }
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  generateCode,
};
