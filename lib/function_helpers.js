"use strict";

/**
 * Returns an array of tokens representing parameter names and comments found in the parameters section.
 * { type: ('comment'|'parameter'|'comma'), text: (string|undefined) }[]
 */
function parameter_tokens (f) {
  var func_string = f.toString();
  var param_start_index = func_string.indexOf('(');
  var i;
  var is_arrow_function = !/^function/.test(func_string);
  if (is_arrow_function) {
    var arrow_index = func_string.indexOf('=>');
    if (param_start_index < arrow_index) {
      i = param_start_index + 1;
    } else {
      i = 0;
    }
  } else {
    i = param_start_index + 1;
  }
  var chars = '';
  var tokens = [];
  var current_token_type = 'parameter';
  var still_parsing_parameters = true;
  var trimmed_chars;

  while (still_parsing_parameters) {
    var current_char = func_string[i];
    if (current_char === '*' && func_string[i + 1] === '/') {
      trimmed_chars = chars.trim();
      if (trimmed_chars) {
        tokens.push({ type: 'comment', text: trimmed_chars });
      }
      chars = '';
      i++;
      current_token_type = 'parameter';
    } else if (current_char === '/' && func_string[i + 1] === '*') {
      trimmed_chars = chars.trim();
      if (trimmed_chars) {
        tokens.push({ type: 'parameter', text: trimmed_chars });
      }
      chars = '';
      i++;
      current_token_type = 'comment';
    } else if (current_token_type === 'parameter' && current_char === ',') {
      trimmed_chars = chars.trim();
      if (trimmed_chars) {
        tokens.push({ type: 'parameter', text: trimmed_chars });
      }
      chars = '';
      tokens.push({ type: 'comma' });
    } else if (current_token_type === 'parameter' && (current_char === ')' || (current_char === '=' && func_string[i + 1] === '>'))) {
      trimmed_chars = chars.trim();
      if (trimmed_chars) {
        tokens.push({ type: 'parameter', text: trimmed_chars });
      }
      chars = '';
      still_parsing_parameters = false;
    } else {
      chars += current_char;
    }

    i++;
  }

  return tokens;
}

function parameters (f) {
  var tokens = parameter_tokens(f);
  var rv = [];
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    if (token.type === "parameter") {
      rv.push(token.text);
    }
  }

  return rv;
}

function body(f) {
  var s = f.toString();
  // TODO: this is not going to work if the function has a comment in the parameters section with a '{' in it, which could happen with type specifications.
  var begin = s.indexOf('{') + 1;
  var end = s.lastIndexOf('}');
  return s.slice(begin, end);
}

module.exports = {
  parameter_tokens: parameter_tokens,
  parameters: parameters,
  body: body
};
