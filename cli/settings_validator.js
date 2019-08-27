"use strict";

var path = require('path');
var deepClone = require('../lib/deep_clone');

module.exports = function (settings_path) {
  var resolved_settings_path = require.resolve(settings_path);
  var settings = deepClone(require(resolved_settings_path));

  if (!settings || isEmptyObject(settings)) throw new Error('No settings specified');

  var plugin_data;
  var i;

  var whiltelisted_main_settings_keys = {
    app_directory: true,
    root_element: true,
    plugins: true
  };
  var whiltelisted_plugins_keys = {
    path: true,
    settings: true
  };
  for (var s in settings) {
    if (!(s in whiltelisted_main_settings_keys)) throw new Error('"' + s + '" is not an allowed main setting');
    if (s === 'plugins') {
      var plugins = settings[s];
      for (i = 0; i < plugins.length; i++) {
        plugin_data = plugins[i];
        for (var p in plugin_data) {
          if (!(p in whiltelisted_plugins_keys)) throw new Error('"' + p + '" is not an allowed plugin setting');
        }
      }
    }
  }

  var app_directory = settings.app_directory;
  var root_element = settings.root_element;
  var settings_plugins_list = settings.plugins;

  if (!app_directory) throw new Error('"settings.app_directory" was not specified');
  if (!isString(app_directory)) throw new Error('"settings.app_directory" must be a string');

  if (!root_element) throw new Error('"settings.root_element" was not specified');
  if (!isString(root_element)) throw new Error('"settings.root_element" must be a string');

  if (!settings_plugins_list) throw new Error('"settings.plugins" was not specified');
  if (!Array.isArray(settings_plugins_list)) throw new Error('"settings.plugins" must be an Array');

  var plugin_paths = {};
  for (i = 0; i < settings_plugins_list.length; i++) {
    plugin_data = settings_plugins_list[i];
    if (!isObject(plugin_data)) throw new Error('plugin data must be an Object');
    if (isEmptyObject(plugin_data)) throw new Error('plugin data is empty {}');
    var plugin_path = plugin_data && plugin_data.path;
    if (!plugin_path) throw new Error('A plugin path was not specified');
    if (plugin_path in plugin_paths) throw new Error('Plugin settings specified more than once for:  "' + plugin_path + '"');
    plugin_paths[plugin_path] = true;
    plugin_data.path = path.resolve(path.dirname(resolved_settings_path), plugin_path);
  }

  return settings;
};

function isString(value) {
  return typeof value === 'string';
}

function isObject(value) {
  return typeof value === 'object' && value !== null;
}

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}
