"use strict";

module.exports = {
  message_gen: function message_gen (message, source, path_name, path_dir) {
    var is_inline = /\n/.test(path_name);
    var parts = path_name ? path_name.split('$') : [];
    var path = parts.length > 1 ? parts[0] + (is_inline ? '' : '.js')
             : parts.length < 1 ? '<path not provided>'
             : path_dir ? path_dir + '/' + parts[0] + (is_inline ? '' : '.js')
             : parts[0] + (is_inline ? '' : '.js');
    var template = parts.length > 1 ? parts[1] + ', in ' : '';
    source = source ? source + ', at ' : '';
    return message + '\n    Source: ' + source + template + path;
  },
  ref_name: function ref_name (path) {
    return path[path.length - 4] !== 'dynamicElementLists' ? path[path.length - 1]
         : path[path.length - 1] !== 'onlyOption' ? path[path.length - 1] + '", an option for dynamicElementList "' + path[path.length - 3]
         : path[path.length - 3];
  }
};
