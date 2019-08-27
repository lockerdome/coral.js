"use strict";

function extract_event_callback_input_computables (params, scope_ref_computables) {
  var input_computables = [];
  for (var i = 0; i !== params.length; ++i) {
    var event_param = params[i];
    var input_computable = scope_ref_computables.get_ref(event_param);
    input_computables.push(input_computable);
  }

  return input_computables;
}

module.exports = extract_event_callback_input_computables;
