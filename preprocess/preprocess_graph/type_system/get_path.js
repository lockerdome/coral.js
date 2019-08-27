"use strict";

var traverse = require('./traverse');

module.exports = function get_path(path, func) {
  return traverse(path, function get(obj, prop, required, seenPath) {
    func(obj[prop], seenPath);
  });
};
