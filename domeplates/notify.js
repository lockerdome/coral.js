"use strict";

function getLocationMessage(fileName, token) {
  return 'in ' + fileName + (token && token.startLoc ? ' on line ' + token.startLoc.line + ' column ' + token.startLoc.col : '');
}

module.exports = {
  warn: function ParseError(msg, fileName, token) {
    console.log('\x1b[33m' + msg + '\x1b[39m ' + getLocationMessage(fileName, token));
  },
  error: function ParseError(msg, fileName, token) {
    throw new Error(msg + ' ' + getLocationMessage(fileName, token));
  }
};
