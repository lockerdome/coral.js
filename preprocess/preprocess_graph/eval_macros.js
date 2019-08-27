"use strict";

var toSource = require('tosource');
var esprima = require('esprima');
var funcParams = require('../../lib/function_helpers').parameters;
var error_message_gen = require('../../lib/error_helper').message_gen;
var sort_fields_on_object = require('../../lib/helpers').sortFields;
var clone_object = require('../../lib/object_helpers').clone;
var path = require('path');
var _require = require;


function strip_var_declaration (input) {
  input = input.trim();
  if (!/^(var|const|let) /.test(input)) return input;
  input = input.substring(input.indexOf('=') + 1);
  if (input[input.length - 1] === ';') input = input.slice(0, -1);
  return input;
}
function expressionify (input) {
  return '"use strict";(' + strip_var_declaration(input) + ')';
}

function EvalEngine (graphTypes, appDirectoryPath) {
  this._appDirectoryPath = path.resolve(appDirectoryPath);
  // Extract all element and model templates before beginning eval
  this.graphTypes = graphTypes;
  this.processed = {};
}

/**
 * Declare all macro functions, then eval the input with those macros available.
 * @param {string} input The string of code to be evaled
 * @param {string} type model|element|model_template|element_template
 * @param {name} name The name of the template file
 * @param {object} template_args Object passed to element_template or model_template call
 * @returns {object}
 */
EvalEngine.prototype.eval_with_macros = function (input, type, name, template_args) {
  var self = this;
  var _paths = _require.main.paths;
  _require.main.paths = [self._appDirectoryPath];
  function require (expression) {
    if (/^\.+\//.test(expression)) {
      expression = path.join(self._appDirectoryPath, type, path.dirname(name), expression);
    }
    return _require(expression);
  }
  function constant (expression) {
    return { '$$coral_macro_type': 'constant', args: { value: expression  } };
  }
  function use_view (view_name) {
    if (!view_name) throw new Error('use_view() requires a valid view path, was given ' + view_name);
    var view = self.graphTypes.views[view_name];
    if (!view) throw new Error('No view file at path "' + view_name + '" passed to the use_view() macro.');
    return view;
  }
  function template (a) {
    if (template_args === undefined) {
      throw new Error(type + '/' + name + ' is not a template, so it may not use the template() macro.');
    } else if (a === undefined) { // used for 'util/inline' element
      return template_args;
    } else if (typeof a === 'function') {
      var params = funcParams(a).map(function (key) { return template_args[key]; });
      return a.apply(template_args, params);
    } else {
      return template_args[a];
    }
  }
  function model_template (template_type, template_args) {
    return $$inject_template('model', template_type, template_args);
  }
  function element_template (template_type, template_args) {
    return $$inject_template('element', template_type, template_args);
  }
  function $$inject_template (scope_type, template_type, args) {
    // Eval template args before passing them to their template
    var evaled = self.eval_with_macros(toSource(args), scope_type, template_type, template_args);

    var generated_template_name = scope_type + '_template(' + template_type + ')';
    var sorted_args = sort_fields_on_object(evaled);

    // Eval template with its args object passed in
    var input = self.graphTypes[scope_type + '_templates'][template_type];
    if (!input) throw new Error('Unable to find ' + scope_type + ' template: ' + template_type);
    var scope = self.eval_with_macros(input, scope_type, generated_template_name, sorted_args);
    return { '$$coral_macro_type': 'generated_inline_scope', args: { source: generated_template_name, scope: scope } };
  }

  // Eval input with above macros available in scope
  input = expressionify(input);
  var evaled;
  try {
    evaled = eval(input);
  } catch (eval_error) {
    _require.main.paths = _paths;
    try {
      esprima.parse(input);
    } catch (esprima_error) {
      eval_error.message = esprima_error.message;
    }
    eval_error.message = error_message_gen(eval_error.message, null, name, type);
    throw eval_error;
  }
  _require.main.paths = _paths;

  return evaled;
};

/**
 * @returns Object containing all model and element objects
 */
EvalEngine.prototype.eval = function () {
  var self = this;
  ['models', 'elements'].forEach(function (type) {
    self.processed[type] = {};
    for (var name in self.graphTypes[type]) {
      var input = self.graphTypes[type][name];
      var output = self.eval_with_macros(input, type, name);
      self.processed[type][name] = typeof output !== 'string' ? output
        : clone_object(self.processed[type][output]);
    }
  });
  return this.processed;
};

module.exports = function (graphTypes, appDirectoryPath) {
  return (new EvalEngine(graphTypes, appDirectoryPath)).eval();
};
