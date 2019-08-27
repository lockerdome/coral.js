"use strict";

var parameter_tokens = require('./function_helpers').parameter_tokens;

module.exports = function(f) {
  var func_str = "\n    " + f.toString().split('\n')[0];
  var tokens = parameter_tokens(f);

  var comment_annotations_with_argument = ['is', 'from'];
  var regex_comment_annotation_with_argument = new RegExp("^(" + comment_annotations_with_argument.join('|') + ")\\s+(.*?)$");
  var comment_annotations = ['async', 'unpacked'];

  var parsed = { output: {}, params: [] };
  var current_param = {};
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    switch (token.type) {
    case 'parameter':
      current_param.name = token.text;
      break;
    case 'comment':
      var target = (i === 0) ? parsed.output
                 : (current_param.name) ? current_param
                 : null;
      if (!target) {
        throw new Error("Function comment /* " + token.text + " */ must come after param, not before." + func_str);
      }

      // Ignore the unusual comment node v8 adds to the parameter section of functions created with the Function constructor.
      if (token.text === '``') {
        break;
      }
      var token_parts = token.text.split('&');
      for (var j = 0; j < token_parts.length; ++j) {
        var comment = token_parts[j].trim();
        var uses_comment_annotation_no_argument = comment_annotations.indexOf(comment) !== -1;
        var match = comment.match(regex_comment_annotation_with_argument);
        if (!match && !uses_comment_annotation_no_argument) {
          throw new Error("Invalid keyword or syntax in comment: " + comment + func_str);
        }
        var keyword = uses_comment_annotation_no_argument ? comment : match[1];
        if (target[keyword]) {
          throw new Error("Multiple '" + keyword + "' keywords in annotation: " + token.text + func_str);
        } else if (uses_comment_annotation_no_argument) {
          target[comment] = true;
        } else if (i === 0 && keyword !== 'is') {
          throw new Error("Output annotations do not support keyword: " + keyword + func_str);
        } else {
          target[keyword] = match[2];
        }
      }
      break;
    case 'comma':
      parsed.params.push(current_param);
      current_param = {};
      break;
    default:
      throw new Error("Unexpected parameter token: " + token.text + func_str);
    }
  }
  if (current_param.name) {
    parsed.params.push(current_param);
  }
  return parsed;
};
