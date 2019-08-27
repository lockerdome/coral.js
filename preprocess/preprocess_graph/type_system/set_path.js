"use strict";

var traverse = require('./traverse');

module.exports = function set_path(path, func) {
  return traverse(path, function set(obj, prop, required, seenPath) {
    obj[prop] = func(obj[prop], prop, required, seenPath);
  });
};
