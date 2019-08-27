"use strict";

var set = require('./set_path');

function typeOf(obj) {
  return obj === null ? 'null'
    : obj === undefined ? 'undefined'
    : Array.isArray(obj) ? 'array'
    : typeof obj;
}

module.exports = function replace(path, propType, replacer) {
  return set(path, function doReplace(val, prop, required, seenPath) {
    if (!required && val == null) return val;
    var type = typeOf(val);
    if (propType[0] === '!') {
      if (type !== 'undefined' && propType === '!undefined') return replacer(val, type, seenPath);
      else if (type !== 'null' && propType === '!null') return replacer(val, type, seenPath);
      else if (type !== 'array' && propType === '!array') return replacer(val, type, seenPath);
      else if (['!undefined', '!array', '!null'].indexOf(propType) === -1 && type !== propType.slice(1)) return replacer(val, type, seenPath);
      else return val;
    } else {
      if (propType === 'all') return replacer(val, type, seenPath);
      else if (type === 'undefined' && propType === 'undefined') return replacer(val, type, seenPath);
      else if (type === 'null' && propType === 'null') return replacer(val, type, seenPath);
      else if (type === 'array' && propType === 'array') return replacer(val, type, seenPath);
      else if (type === propType) return replacer(val, type, seenPath);
      else return val;
    }
  });
};
