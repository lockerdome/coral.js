"use strict";

var suggest_it = require('suggest-it');

/**
 * @constructor
 */
function ScopeRefComputables(scope_name, parentScopeRefComputables) {
  this._scope_name = scope_name;
  this._refs = {};
  this._implied_paths = {};
  this._computable_identity_to_nesteds = {};
  this._parent = parentScopeRefComputables;
}

ScopeRefComputables.create_closure = function (parentScopeRefComputables) {
  return new ScopeRefComputables(parentScopeRefComputables._scope_name, parentScopeRefComputables);
};

ScopeRefComputables.prototype._expand_path = function (path_parts) {
  var implied_path = this._implied_paths[path_parts[0]];
  if (implied_path) {
    return implied_path.split('.').concat(path_parts.slice(1));
  }

  if (this._parent) {
    return this._parent._expand_path(path_parts);
  }

  return path_parts;
};

ScopeRefComputables.prototype._get_ref = function (path_parts) {
  var ref = this._refs[path_parts[0]];
  if (!ref && this._parent) {
    ref = this._parent._get_ref(path_parts);
  }

  if (typeof ref === 'function') {
    ref = ref();
  }

  return ref;
};

/**
 * @returns {Object} Object containing all unique ref names all the way up the hierarchy
 */
ScopeRefComputables.prototype._get_all_unique_ref_names = function () {
  var output = {};
  for (var ref_name in this._refs) {
    output[ref_name] = true;
  }
  if (this._parent) {
    var parent_unique_refs = this._parent._get_all_unique_ref_names();
    for (var parent_ref_name in parent_unique_refs) {
      output[parent_ref_name] = true;
    }
  }

  return output;
};

/**
 * @param {string} path
 * @returns {Computable} Returns a Computable for the given path, creating a nested if necessary.
 */
ScopeRefComputables.prototype.get_ref = function (path) {
  var path_parts = path.split('.');
  path_parts = this._expand_path(path_parts);
  var ref_computable = this._get_ref(path_parts);

  if (!ref_computable) {
    var unique_ref_names = this._get_all_unique_ref_names();
    var ref_names = Object.keys(unique_ref_names);
    var suggester = suggest_it(ref_names);
    var suggestion = suggester(path_parts[0]);
    var message = suggestion ? (' Did you mean: ' + suggestion + '?') : '';
    throw new Error(this._scope_name+': Invalid argument, '+JSON.stringify(path)+'.'+message);
  }

  for (var i = 1; i !== path_parts.length; ++i) {
    var current_path_part = path_parts[i];
    var ref_computable_nesteds = this._computable_identity_to_nesteds[ref_computable.get_identity()] || {};
    var ref_computable_nested = ref_computable_nesteds[current_path_part];
    if (!ref_computable_nested) {
      ref_computable_nested = ref_computable.get_property(current_path_part);
      ref_computable_nesteds[current_path_part] = ref_computable_nested;
      this._computable_identity_to_nesteds[ref_computable.get_identity()] = ref_computable_nesteds;
    }
    ref_computable = ref_computable_nested;
  }

  return ref_computable;
};

/**
 * @param {string} name
 * @param {Computable|function} ref_computable_or_getter
 * @param {string} [base_name_implies_path] Specifies a nested path that will automatically be used if the ref is requested using exactly the name specified as the first parameter.  Examples of this would be referencing a model scope by name, you obviously mean to use the output field on that model scope.
 */
ScopeRefComputables.prototype.add_ref = function (name, ref_computable_or_getter, base_name_implies_path) {
  if (base_name_implies_path) {
    this._implied_paths[name] = name + '.' + base_name_implies_path;
  }

  this._refs[name] = ref_computable_or_getter;
};

ScopeRefComputables.prototype.scope_args_to_param_inputs = function (scope_container_name, scope_type, scope_name, args, info_by_scope_type) {
  var params = info_by_scope_type.get_params(scope_type, scope_name);

  if (!params) {
    throw new Error(scope_container_name+": No "+scope_type+" named "+scope_name);
  }

  try {
    return this.args_to_param_inputs(args, params, this);
  } catch (e) {
    throw new Error(scope_container_name + ': Invalid parameters for ' + scope_type + ' ' + scope_name + ': ' + e.message);
  }
};

ScopeRefComputables.prototype.args_to_param_inputs = function (args, params) {
  var output = [];

  var missing_params = [];
  var i;
  for (i = 0; i !== params.length; ++i) {
    var param = params[i];
    if (!args[param]) {
      missing_params.push(param);
    }
  }

  if (missing_params.length) {
    throw new Error("Missing params - "+missing_params.join(',')+" given "+params+" "+JSON.stringify(args));
  }

  var extra_params = [];
  for (var arg_name in args) {
    if (params.indexOf(arg_name) === -1) {
      extra_params.push(arg_name);
    }
  }

  if (extra_params.length) {
    throw new Error('Provided extra arguments - ' + extra_params.join(','));
  }

  var bad_args = [];
  for (i = 0; i !== params.length; ++i) {
    try {
      output.push(this.get_ref(args[params[i]]));
    } catch (e) {
      e.message = 'Bad arg for parameter "' + params[i] + '", was given argument "' + args[params[i]] + '" - ' + e.message;
      throw e;
    }
  }
  return output;
};

module.exports = ScopeRefComputables;
