"use strict";

/**
 * @param {Object} target
 * @param {Array.<string>} path
 */
function get_at_path (target, path) {
  var cur = target;
  for (var i = 0; i !== path.length; ++i) {
    if (cur !== null && typeof cur === 'object') cur = cur[path[i]];
    else {
      cur = undefined;
      break;
    }
  }
  return cur;
}

module.exports = get_at_path;
