"use strict";

/* global $$SYMBOLS,$$HELPERS */

module.exports = function (register_global_helper) {
  // TODO: These are not going to be good for performance, we should instead generate functions for getting a character in the range or determining if in range for each that has the exact logic needed and without any loops.
  register_global_helper(
    'is_character_code_in_range',
    function (range, code) {
      for (var i = 0; i !== range.length; i+=2) {
        if (code >= range[i] && code < range[i + 1]) {
          return true;
        }
      }
      return false;
    }
  );

  register_global_helper(
    'get_character_in_range',
    function (range, index) {
      var running_count = 0;
      for (var i = 0; i !== range.length; i+=2) {
        var start_code = range[i];
        var end_code = range[i + 1];

        var count = end_code - start_code;

        var current_offset = index - running_count;

        if (current_offset < count) {
          return String.fromCharCode(start_code + current_offset);
        }

        running_count += count;
      }

      return false;
    }
  );

  register_global_helper(
    'is_global_symbol',
    function (symbol) {
      return $$HELPERS.is_character_code_in_range$$($$SYMBOLS.ranges.GLOBAL_RANGES$$, symbol.charCodeAt(0));
    }
  );
};
