"use strict";

var format = require('util').format;

// TODO: Think about recursive templated functions

/**
 * @param {Object} path_handlers
 */
function TemplateProcessor (path_handlers) {
  this._path_handlers = path_handlers;
}

/**
 * @param {string} stringified_function
 * @returns {string}
 */
TemplateProcessor.prototype.process_stringified_function_template = function (stringified_function) {
  var path_handlers = this._path_handlers;
  var valid_return_types = ['string', 'number'];

  return stringified_function.replace(/\$\$((\w|\.)+)\$\$/g, function (match, path, ignored, offset) {
    var split_path = path.split('.');
    var current = path_handlers;
    for (var i = 0; i !== split_path.length; ++i) {
      var path_part = split_path[i];
      var old_current = current;
      current = current[path_part];

      if (typeof old_current === 'function') {
        try {
          current = old_current(path_part);
        } catch (e) {
          e.message = format('Problem calling path handler in template processor at "%s" given path "%s"\n', split_path.slice(0, i + 1).join('.'), path) + e.message;
          throw e;
        }
      } else if (current !== null && (typeof current === 'function' || typeof current === 'object' || valid_return_types.indexOf(typeof current) !== -1)) {
        continue;
      } else {
        throw new Error(format('Unable to fully traverse to desired path "%s", got to "%s" and found type "%s" "%s" for '+"\n"+'%s', path, split_path.slice(0, i + 1).join('.'), typeof current, current, stringified_function.slice(offset - 100, offset) + stringified_function.slice(offset, offset + 100)));
      }
    }

    if (Array.isArray(current)) {
      // Specifically using toString here so Infinity gets inserted correctly, JSON.stringify will turn it to null.
      return '[' + current.toString() + ']';
    }

    if (valid_return_types.indexOf(typeof current) === -1) {
      throw new Error(format('Invalid value at path "%s", got type %s, %s for %s', path, typeof current, current));
    }

    if (split_path[0] === 'HELPERS') return format('Coral.sponges[%j]', current);
    return current;
  });
};

/**
 * @param {Object} path_handlers
 *   The object should be made up of nested objects or keys assigned to functions.
 *
 *   A key assigned to a function will use that function to evaluate a field name under that key.
 *     Example:
 *       {  HELPERS: get_helper }
 *       process_template('function(elem) { return $HELPERS.process_elem$(elem); }
 *       - Will call get_helper('process_elem') and replace "$HELPERS.process_elem$" with the string given.
 *       - So if get_helper('process_elem') returns "U" the function will be "function(elem) { return U(elem); }"
 *
 *   Nested objects should have keys that all resolve to strings or nested objects.
 *     - The template system will traverse nested objects using the path given.
 *     Example:
 *       { SYMBOLS: { SCOPES: { PARENT: 'p' } } }
 *       process_template('function() { return this.$SYMBOLS.SCOPES.PARENT$; }')
 *       Will result in 'function() { return this.p; }'
 *
 *   The templating system will blow up if the path helper function called blows up or the path does not resolve to a string value.
 *   So if someone changes the name of a symbol constant one of the helpers utilize through the templating system, the
 *   templating system will loudly let you know.
 */
function build_template_processor (path_handlers) {
  var processor = new TemplateProcessor(path_handlers);
  return function (stringified_function) {
    return processor.process_stringified_function_template(stringified_function);
  };
}

module.exports = build_template_processor;
