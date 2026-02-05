const { v4: uuidv4, validate: uuidValidate } = require('uuid');

function isValidUUID(str) {
  return typeof str === 'string' && uuidValidate(str);
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(pw) {
  return typeof pw === 'string' && pw.length >= 6;
}

function validateCue(body) {
  const errors = [];
  if (body.name !== undefined && typeof body.name !== 'string') errors.push('name must be a string');
  if (body.time !== undefined && (typeof body.time !== 'number' || body.time < 0)) errors.push('time must be a non-negative number');
  if (body.fade !== undefined && (typeof body.fade !== 'number' || body.fade < 0)) errors.push('fade must be a non-negative number');
  if (body.marker_color !== undefined && typeof body.marker_color !== 'string') errors.push('marker_color must be a string');
  return errors;
}

function generateUUID() {
  return uuidv4();
}

module.exports = { isValidUUID, validateEmail, validatePassword, validateCue, generateUUID };
