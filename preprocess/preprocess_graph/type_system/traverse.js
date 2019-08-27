"use strict";

module.exports = function traverse(path, func) {
  var parts = path.split('.').map(function (item) {
    return item[item.length - 1] === '?' ? { required: false, value: item.slice(0, -1) }
      : { required: true, value: item };
  });
  return function replacePath(parts, treadPath, obj) {
    var cur = obj;
    var firstParts = parts.slice(0, -1);
    var lastPart = parts.slice(-1)[0];
    for (var i = 0; i !== firstParts.length; ++i) {
      var part = firstParts[i];
      if (part.value === '*') {
        for (var key in cur) {
          cur[key] = replacePath(firstParts.slice(i+1).concat(lastPart), treadPath.concat(key), cur[key], true);
        }
        return obj;
      } else {
        treadPath.push(part.value);
        cur = cur[part.value];
        if (cur == null && !part.required) return obj;
        if (cur == null && part.required) throw new Error('Required property ' + treadPath.join('.') + ' ' + path + ' ' + part.required);
      }
    }
    if (lastPart.value === '*') {
      for (var prop in cur) {
        func(cur, prop, true, treadPath.concat(prop));
      }
    } else {
      func(cur, lastPart.value, lastPart.required, treadPath.concat(lastPart.value));
    }
    return obj;
  }.bind(null, parts, []);
};
