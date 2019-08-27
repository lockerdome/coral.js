"use strict";

var replace = require('./convert_type');
var helpers = require('../../../lib/helpers');
var sequence = helpers.sequence;

function collectLocalRefs(prefix, type) {
  return function (obj, fields) {
    return replace(prefix + '.*', type || 'all', function (info, type, beginPath) {
      var localRefs = [];
      var localRefsHash = {};
      function collectLocalRef(typeName) {
        return replace('*', 'all', function (val, type, seen) {
          var name = typeName === 'params' ? val.name : seen[seen.length - 1];
          var localRef = { type: typeName, value: val, name: name };
          localRefs.push(localRef);
          localRefsHash[name] = localRef;
          return val;
        });
      }
      function setLocalRefs(obj) {
        obj.localRefs = localRefs;
        obj.localRefsHash = localRefsHash;
        return obj;
      }
      function collectFields(info, fields) {
        return sequence.apply(null, fields.map(function (fieldName) {
          return replace(fieldName + '?', 'all', collectLocalRef(fieldName));
        }))(info, fields);
      }
      return sequence(
        collectFields,
        setLocalRefs
      )(info, fields);
    })(obj, fields);
  };
}

module.exports = collectLocalRefs;
