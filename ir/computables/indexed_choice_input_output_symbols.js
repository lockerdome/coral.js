"use strict";

function indexed_choice_input_output_symbols (execution_context, choice_indexes, async_output_symbols, sync_output_symbols) {
  if (!choice_indexes.length) {
    return [];
  }

  var async_input_symbols = (function (input_indexes, get_symbol_range, execution_context) {
    var output = '';
    for (var i = 0; i !== input_indexes.length; ++i) {
      var input_index = input_indexes[i];
      output += get_symbol_range.call(execution_context, input_index, input_index + 1).join('');
    }

    return output;
  })(choice_indexes, execution_context.get_async_pre_init_symbol_range, execution_context);

  var sync_input_symbols = (function (input_indexes, get_symbol_range, execution_context) {
    var output = '';
    for (var i = 0; i !== input_indexes.length; ++i) {
      var input_index = input_indexes[i];
      output += get_symbol_range.call(execution_context, input_index, input_index + 1).join('');
    }

    return output;
  })(choice_indexes, execution_context.get_sync_init_non_async_pre_init_symbol_range, execution_context);

  return async_input_symbols.concat(
    async_output_symbols,
    '$$SYMBOLS.special.SEPARATOR$$',
    sync_input_symbols,
    sync_output_symbols
  );
}

module.exports = indexed_choice_input_output_symbols;
