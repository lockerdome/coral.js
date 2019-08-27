"use strict";

var get = require('./get_path');

module.exports = function createFieldNameUniqueCheck(path, fields) {
  var nameDirectory = {};
  return get(path, function fieldCheck(fieldNames, treadedPath) {
    var elementTypeName = treadedPath[1];
    var fieldType = treadedPath[treadedPath.length - 1];

    if (fields.indexOf(fieldType) === -1) return;

    if (!nameDirectory[elementTypeName]) {
      nameDirectory = {};
      nameDirectory[elementTypeName] = {};
    }

    var ref_names = (fieldType === 'params') ? fieldNames.map(function (name) { return name.name; }) : Object.keys(fieldNames);
    ref_names.forEach(function (value) {
      var match = nameDirectory[elementTypeName][value];
      if (match) {
        throw new Error("Duplicate name detected in '" + elementTypeName  + "', '" + value + "' in both '" + match + "' and '" + fieldType + "'.");
      }

      nameDirectory[elementTypeName][value] = fieldType;
    });
  });
};

