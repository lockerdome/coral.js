"use strict";

/**
 * @param {Object} source
 * @param {string} root_element
 * @param {Object} argv
 * @param {Object} settings_plugins_list
 */
function Compiler (hook_manager, source, root_element, argv, settings_plugins_list) {
  this._source = source;
  this._root_element = root_element;
  this._hook_manager = hook_manager;

  // TODO: Get rid of cData
  this.cData = {
    sort_refs: require('./preprocess/preprocess_graph/sort_refs')
  };

  for (var i = 0; i < settings_plugins_list.length; i++) {
    var plugin_data = settings_plugins_list[i];
    var plugin_path = plugin_data.path ? plugin_data.path : plugin_data;
    var plugin_settings = plugin_path ? plugin_data.settings : null;
    var plugin = require(plugin_path);
    // TODO: Consider scoping argv passing by plugin name and have plugins expose a name
    // * So for the standard compile_client_app plugin, it would get arguments on argv that start with "compile_client_app."
    new plugin(hook_manager, plugin_settings, argv, this.cData);
  }

}

module.exports = Compiler;
