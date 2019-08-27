"use strict";

var acceptable_content_editable_keys = ['Enter', 'Escape', 'Backspace'];
var acceptable_line_input = acceptable_content_editable_keys.concat(['ArrowUp', 'ArrowDown', 'Control', 'Alt']);
var acceptable_special_keys = acceptable_line_input.concat(['ArrowRight', 'ArrowLeft']);

var metakeys_not_shift = ['Control', 'Alt'];

var transform_keys = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  enter: 'Enter',
  esc: 'Escape',
  ctrl: 'Control',
  alt: 'Alt',
  backspace: 'Backspace'
};

var disallowed_key_codes = {
  43: 'Plus',
  62: 'Greater than'
};

function validate_key_generator(key_range) {
  var key_map = key_range.reduce(function (rv, item) {
    rv[item] = true;
    return rv;
  }, {});

  return function (key) {
    return key_map[key];
  };
}

var shared_commands = {
  validate_content_editable_key: validate_key_generator(acceptable_content_editable_keys),
  validate_line_input_key: validate_key_generator(acceptable_line_input),
  validate_special_key: validate_key_generator(acceptable_special_keys),
  validate_general_key: function (key) {
    if (key && (typeof key === 'string')) {
      if (shared_commands.validate_special_key(key)) return true;

      var key_code = key.charCodeAt(0);
      if (key.length === 1 && !disallowed_key_codes[key_code] && key_code >= 32 && key_code < 127) return true;
    }
    return false;
  },
  transform_key: function (key) {
    return transform_keys[key];
  },
  has_metakeys_not_shift: function (obj) {
    return metakeys_not_shift.some(function (a) { return obj[a]; });
  }
};

module.exports = shared_commands;
