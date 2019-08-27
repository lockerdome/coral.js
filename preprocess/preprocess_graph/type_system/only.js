"use strict";

var suggestIt = require('suggest-it');
var get = require('./get_path');

module.exports = function createFieldCheck(path, fields) {
  var suggester = suggestIt(fields);
  return get(path, function fieldCheck(fieldValue, treadedPath) {
    var fieldName = treadedPath[treadedPath.length - 1];
    if (fields.indexOf(fieldName) === -1) {
      var suggestion = suggester(fieldName);
      var message = suggestion ? (' Did you mean: ' + suggestion + '?') : '';
      var parts = treadedPath[1].split('$');
      var template = parts.length > 1 ? parts[1] + ' in ' : treadedPath[0] + '/';
      throw new Error('Unable to load ' + template + parts[0] + '.js because it uses unknown field "' + fieldName + '".' + message);
    }
  });
};
