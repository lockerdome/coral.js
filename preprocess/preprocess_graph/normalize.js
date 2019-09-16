"use strict";

var func_params = require('../../lib/function_helpers').parameters;
var function_parser = require('../../lib/function_parser');
var replace = require('./type_system/convert_type');
var get_path = require('./type_system/get_path');
var only = require('./type_system/only');
var check_params = require('./type_system/check_params');
var check_unique_names = require('./type_system/unique_names');
var collect_local_refs = require('./type_system/collect_refs');
var error_helper = require('../../lib/error_helper');

var helpers = require('../../lib/helpers');
var sequence = helpers.sequence;
var object_filter = helpers.objectFilter;
var transform = helpers.transform;

function not(fn) {
  return function () {
    return !fn.apply(this, arguments);
  };
}

function defaultToObj() {
  return {};
}

function defaultToArray() {
  return [];
}

function defaultToFalse() {
  return false;
}

function defaultToString(string) {
  return function () { return string; };
}

function strToInputArgs(str) {
  return { type: str, args: {} };
}

function isModelParam(val) {
  return (/^item_index$|^item(\.|$)/).test(val);
}

function unexpected(msg) {
  return function (item, type, path) {
    throw new Error(error_helper.message_gen('Unexpected ' + type + '. ' + msg, null, path[1], path[0]));
  };
}

function toInlineFunctionObject(func) {
  var parsed_params = function_parser(func).params;
  var params = [], args = {};
  for (var i = 0; i < parsed_params.length; i++) {
    var param = parsed_params[i];
    params.push(param.name);
    args[param.name] = param.from || param.name;
  }
  return { type: '!inline', params: params, output: func, args: args, parsed_params: parsed_params };
}

function argProcess(prefix) {
  return sequence(
    replace(prefix + '.*.args', '!object', defaultToObj),
    replace(prefix + '.*.args.*', '!string', unexpected('Expected string as ' + prefix + ' args values'))
  );
}

function addName(prefix) {
  return replace(prefix + '.name', '!string', function (val, type, path) {
    return path[path.length - 2];
  });
}

function modelProcess(prefix) {
  return sequence(
    replace(prefix + '.models', 'undefined', defaultToObj),
    replace(prefix + '.models', '!object', unexpected('The models key can only be set to an object')),
    replace(prefix + '.models.*', 'string', strToInputArgs),
    replace(prefix + '.models.*', 'function', toInlineFunctionObject),
    replace(prefix + '.models.*', '!object', unexpected('Models can only be set to a compute function or model scope')),
    replace(prefix + '.models.*.type', 'object', unexpected('Incorrect inline model, please specify some model scope keys')),
    replace(prefix + '.models.*.type', '!string', unexpected('Expected type as string')),
    argProcess(prefix + '.models')
  );
}

function environmentVarsProcess(prefix) {
  return sequence(
    replace(prefix + '.environmentVars', '!undefined', function (val, type, path) {
      if (!Array.isArray(val)) {
        return unexpected('environmentVars must be an array if defined')(val, type, path);
      }

      return val;
    }),
    replace(prefix + '.environmentVars?.*', '!string', unexpected('Only string ref names may be provided as values to the environmentVars array'))
  );
}

function showWhenProcess (prefix) {
  return replace(prefix, 'all', function (parent_element, type, path) {
    if (!parent_element.elements) return parent_element;
    var kept_elements = {};

    for (var ref in parent_element.elements) {
      var element = parent_element.elements[ref];
      var showWhen = element.showWhen;

      if (showWhen) {
        delete element.showWhen;
        if (!parent_element.dynamicElementLists) {
          parent_element.dynamicElementLists = {};
        }
        parent_element.dynamicElementLists[ref] = {
          showWhen: true,
          model: showWhen,
          options: { onlyOption: element },
          identity: '',
          map: function () { return 'onlyOption'; }
        };
      } else {
        kept_elements[ref] = element;
      }
    }
    parent_element.elements = kept_elements;
    return parent_element;
  });
}

function paramProcess(prefix) {
  return sequence(
    replace(prefix + '.params', 'all', function (items, typename, path) {
      if (items === undefined) {
        return [];
      }

      if (!Array.isArray(items)) {
        return unexpected("Expected params to not be defined or be an array")(items, typename, path);
      }

      var has_seen = {};
      var duplicates = {};

      var updated_items = [];
      for (var i = 0; i !== items.length; ++i) {
        var entry = items[i];

        if (typeof entry === 'string') {
          entry = { name: entry };
        } else if (typeof entry !== 'object') {
          return unexpected("Unexpected non-object in params")(entry, typename, path);
        }

        if (!entry.name) {
          return unexpected("Unexpected param without a name")(entry, typename, path);
        }

        for (var key in entry) {
          if (key !== 'name' && key !== 'type' && key !== 'invariant') {
          return unexpected("Unexpected key in param specification")(entry, typename, path);
          }
        }

        if (has_seen[entry.name]) duplicates[entry.name] = true;
        has_seen[entry.name] = true;

        updated_items.push(entry);
      }

      var duplicate_keys = Object.keys(duplicates);
      if (duplicate_keys.length) {
        var message = 'Found duplicated param: ' + duplicate_keys.join(', ');
        throw new Error(error_helper.message_gen(message, null, path[path.length - 2], path[path.length - 3]));
      }
      return updated_items;
    })
  );
}

function depsProcess(prefix) {
  return sequence(
    replace(prefix + '.deps', '!array', defaultToArray),
    replace(prefix + '.deps', 'array', function (deps, typename, path) {
      var seen_urls = {};
      return deps.map(function (dep) {
        if (typeof dep === 'string') {
          dep = { url: dep };
        }
        if (dep == null || typeof dep !== 'object') {
          unexpected("Dependency type invalid (only 'string' and 'object' allowed).")(deps, typename, path);
        }
        if (!dep.url) {
          unexpected("Dependency needs a url.")(deps, typename, path);
        }
        if (dep.url in seen_urls) {
          unexpected("Duplicate dependency: " + dep.url)(deps, typename, path);
        }
        if (!dep.type) {
          dep.type = dep.url.split('.').pop();
        }
        if (dep.type === 'js') {
          dep.type = 'javascript';
        }
        if (dep.type !== 'javascript' && dep.type !== 'css') {
          unexpected("Dependency invalid (only 'js' and 'css' allowed).")(deps, typename, path);
        }
        seen_urls[dep.url] = true;

        if (!/^\{\{deps_base_url\}\}/.test(dep.url) && !/^(https?:)?\/\//.test(dep.url)) {
          dep.url = "{{deps_base_url}}" + dep.url;
        }

        return dep;
      });
    })
  );
}

function eventProcess(prefix) {
  return sequence(
    replace(prefix + '.events', 'array', function (events) {
      for (var i = 0; i !== events.length; ++i) {
        var event = events[i];
        if (!event.params) {
          event.params = func_params(event.output);
          event.args = {};
          for (var j = 0; j !== event.params.length; ++j) {
            var param = event.params[j];
            event.args[param] = param;
          }
        }
      }
      return events;
    }),
    replace(prefix + '.events', 'object', function (events) {
      var rv = [];
      for (var i in events) {
        var is_callback = typeof events[i] === "string";
        if (is_callback) {
          var callback_name = events[i];
          if (/^(catch|message)/.test(i)) {
            events[i] = new Function (callback_name, 'args', callback_name+'.apply(null, args)');
          } else {
            events[i] = new Function (callback_name, callback_name+'()');
          }
        }

        var functionObject = toInlineFunctionObject(events[i]);
        functionObject.event = i;
        rv.push(functionObject);
      }
      return rv;
    }),
    replace(prefix + '.events', '!array', defaultToArray)
  );
}

function shardingProcess(prefix) {
  return replace(prefix + '.shard', 'all', function (shard, typename, path) {
    if (shard == null || shard === false) return false;
    if (shard === true) return {};
    if (typeof shard !== 'object' || Array.isArray(shard)) {
      return unexpected('Expected shard to be boolean or object if defined.')(shard, typename, path);
    }
    for (var key in shard) {
      if (key !== 'traits' && key !== 'include_traits') {
        return unexpected(key + ' is not a valid key for shard object.')(key, typename, path);
      }
      var value = shard[key];
      if (!Array.isArray(value) || !value.length) {
        return unexpected(key + ' property (if set) must be an array with length > 0.')(value, typename, path);
      }
      if (value.some(function (el) { return typeof el !== 'string'; } )) {
        return unexpected('Non-string found in ' + key + ' array.')(value, typename, path);
      }
    }
    return shard;
  });
}

function constantProcess(prefix) {
  return replace(prefix + '.constants', '!object', defaultToObj);
}

function variablesProcess(prefix) {
  return sequence(
    replace(prefix + '.variables', '!object', defaultToObj),
    replace(prefix + '.variables.*', 'function', toInlineFunctionObject)
  );
}

function elementProcess(prefix) {
  return sequence(
    replace(prefix + '.elements', '!object', defaultToObj),
    replace(prefix + '.elements.*', 'string', strToInputArgs),
    replace(prefix + '.elements.*.type', 'object', unexpected('Incorrect inline element, please specify a view for the inline element')),
    replace(prefix + '.elements.*.type', '!string', unexpected('Expected type as string')),
    argProcess(prefix + '.elements')
  );
}

function dynamicElementListsProcess(prefix) {
  return sequence(
    replace(prefix + '.dynamicElementLists', '!object', defaultToObj),
    replace(prefix + '.dynamicElementLists.*.model', '!string', function (model, type, path) {
      if (typeof model === 'function') return toInlineFunctionObject(model);
      unexpected('Expected string as model property in dynamic element')(model, type, path);
    }),
    replace(prefix + '.dynamicElementLists.*', 'object', function (list) {
      if (!list.item) return list;

      list.options = { item: list.item };
      list.map = function () { return 'item'; };
      return list;
    }),
    replace(prefix + '.dynamicElementLists.*.options', '!object', unexpected('Expected object as options property in dynamic element')),
    replace(prefix + '.dynamicElementLists.*.options.*', 'string', strToInputArgs),
    replace(prefix + '.dynamicElementLists.*.options.*', '!object', unexpected('Expected object as options choice in dynamic element')),
    argProcess(prefix + '.dynamicElementLists.*.options'),
    only(prefix + '.dynamicElementLists.*.options.*.*', ['type', 'args']),
    replace(prefix + '.dynamicElementLists.*.options.*.type', 'object', unexpected('Incorrect inline element, please specify a view')),
    replace(prefix + '.dynamicElementLists.*.options.*.type', '!string', unexpected('Expected type as string')),
    replace(prefix + '.dynamicElementLists.*.options.*', 'object', function (option) {
      option.parentParams = object_filter(option.args, not(isModelParam));
      return option;
    }),
    replace(prefix + '.dynamicElementLists.*.map', '!function', unexpected('Expected function as map property in dynamic element'))
  );

}

function callbacksProcess(prefix) {
  return sequence(
    replace(prefix + '.callbacks', '!object', defaultToObj),
    replace(prefix + '.callbacks.*', '!function', unexpected('Expected function as a callback in element')),
    replace(prefix + '.callbacks.*', 'function', toInlineFunctionObject)
  );
}

function outputProcess(prefix) {
  return replace(prefix, 'object', function (model, type, path) {
    if (typeof model.output === 'function') {
      model.models = model.models || {};
      model.models.__output = model.output;
      model.output = '__output';
    }
    return model;
  });
}

function checkElements(info, settings) {
  var s = settings.checkElements;
  var customChecks = s.customChecks || [];
  return sequence(
    showWhenProcess('elements.*'),
    shardingProcess('elements.*'),
    paramProcess('elements.*'),
    depsProcess('elements.*'),
    constantProcess('elements.*'),
    variablesProcess('elements.*'),
    eventProcess('elements.*'),
    environmentVarsProcess('elements.*'),
    modelProcess('elements.*'),
    callbacksProcess('elements.*'),
    elementProcess('elements.*'),
    dynamicElementListsProcess('elements.*'),
    addName('elements.*'),
    sequence.apply(null,
      customChecks
    ),
    only('elements.*.*', s.only),
    only('elements.*.dynamicElementLists.*.*', ['identity', 'map', 'options', 'item', 'model', 'showWhen']),
    check_unique_names('elements.*.*', s.check_unique_names),
    replace('elements.*.parents', '!array', defaultToArray)
  )(info, settings);
}

function checkModels (info, settings) {
  var s = settings.checkModels;
  var customChecks = s.customChecks || [];

  return sequence (
    paramProcess('models.*'),
    constantProcess('models.*'),
    outputProcess('models.*'),
    modelProcess('models.*'),
    environmentVarsProcess('models.*'),
    addName('models.*'),
    sequence.apply(null,
      customChecks
    ),
    only('models.*.*', s.only),
    check_unique_names('models.*.*', s.check_unique_names)
  )(info, settings);

}

function processElemViews(info) {
  return sequence(
    // Check the view specification on the element and inline the view into the element.
    replace('elements.*', 'all', function (obj, type, path) {
      var elem_name = path[path.length - 1];
      var lastPart = (elem_name.split('$')[2] || '').substr(0, 70);
      try {
        var view = info.views[elem_name];
        if (view != null && obj.view != null) throw new Error('Provided both inline view and separate file view for element. ' + lastPart);
        // Inline the view onto the element if not already there.
        obj.view = obj.view == null ? view : obj.view;
        if (obj.view == null) throw new Error('Element has no view. ' + lastPart);
        if (typeof obj.view !== 'string') throw new Error('Element\'s view must be a string. ' + lastPart);
      } catch(e) {
        e.message = error_helper.message_gen(e.message, null, elem_name, 'elements');
        throw e;
      }
      return obj;
    }),
    replace('elements.*.preload', '!string', function (val, type, path) {
      if (val !== undefined) {
        return unexpected('Can not specify "preload" as a non-string, it should be an inlined view (from the use_view macro or specified inline directly)')(val, type, path);
      }

      return val;
    })
  )(info);
}

function validateParams(info) {
  return sequence(
    replace('elements.*.parents', 'undefined', defaultToArray),
    replace('models.*.parents', 'undefined', defaultToArray),
    check_params('elements.*.models.*', 'models'),
    check_params('elements.*.elements.*', 'elements'),
    check_params('elements.*.dynamicElementLists.*.options.*', 'elements'),
    check_params('models.*.models.*', 'models')
  )(info);
}

module.exports = function () {
  return {
    default_values: function default_values (info) {
      return sequence(
        eventProcess('elements.*'),
        paramProcess('elements.*')
      )(info);
    },
    normalize: function normalize (info, settings) {
      return sequence(
        checkElements,
        checkModels,
        processElemViews,
        validateParams
      )(info, settings);
    },
    index_refs: function index_refs (info, fields) {
      return sequence(
        collect_local_refs('elements'),
        collect_local_refs('models')
      )(info, fields);
    },
    helpers: {
      // I picked these ones to expose because they seemed like they were more likely to be used outside of this file.
      // We can remove some or add the rest of the functions in this file if we want though.
      not: not,
      defaultToObj: defaultToObj,
      defaultToArray: defaultToArray,
      defaultToFalse: defaultToFalse,
      defaultToString: defaultToString,
      strToInputArgs: strToInputArgs,
      isModelParam: isModelParam,
      argProcess: argProcess,
      unexpected: unexpected,
      toInlineFunctionObject: toInlineFunctionObject
    }
  };
};
