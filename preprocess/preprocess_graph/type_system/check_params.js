"use strict";

var suggestIt = require('suggest-it');
var get_path = require('./get_path');
var error_helper = require('../../../lib/error_helper');

function ident(x) {
  return x;
}

module.exports = function checkParams(callPath, sourcePath, skip) {
  return function (obj) {
    return get_path(callPath, function (call, seenPath) {
      try {
        if (call.type === '!inline') return;
        var callable = obj[sourcePath][call.type];
        var targetType = seenPath[0].slice(0, -1);
        var lookupType = sourcePath.slice(0, -1);
        if (!callable) {
          var callSuggester = suggestIt(Object.keys(obj[sourcePath]));
          if (!call.type) {
            throw new Error('The ' + lookupType + ' "' + error_helper.ref_name(seenPath) + '" doesn\'t have a "type" property.');
          } else {
            var suggestion = callSuggester(call.type);
            var message = suggestion ? (' Did you mean: ' + suggestion + '?') : '';
            throw new Error('The ' + lookupType + ' "' + error_helper.ref_name(seenPath) + '" has type specified as "' + call.type + '", but no ' + lookupType + ' exists at that path.' + message);
          }
        }
        var args = call.args;
        var params = (callable.params || []).map(function(param) { return param.name; });
        if (skip) return;
        var alreadyHasParent = callable.parents.filter(function (parent) {
          return parent.name === seenPath[1];
        }).length;
        if (!alreadyHasParent) {
          callable.parents.push({ type: targetType, name: seenPath[1] });
        }
        var suggester = suggestIt(params);
        var errors = Object.keys(args).map(function (name) {
          if (params.indexOf(name) === -1) {
            var suggestion = suggester(name);
            var message = suggestion ? (' Did you mean: ' + suggestion + '?') : '';
            return 'Provided extra param "' + name + '" to ' + lookupType + ' "' + error_helper.ref_name(seenPath) + '".' + message;
          }
        }).filter(ident);
        if (errors.length) {
          throw new Error(errors.join(' '));
        }
      } catch(e) {
        e.message = error_helper.message_gen(e.message, null, seenPath[1], sourcePath);
        throw e;
      }
    })(obj);
  };
};

