#!/usr/bin/env node
"use strict";

var optimist = require('optimist');

var walker = require('./lib/directory_walker');

var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');

var preprocess = require('../preprocess/preprocess');
var generate_scopes = require('../ir_gen/generate_scopes');
var Compiler = require('../compiler');
var HookManager = require('../hook_manager.js');

var argv = optimist.string(['_', '0']).argv;

var settings_validator = require('./settings_validator');
var settings_path = path.resolve(process.cwd(), argv.s);
var settings;
try {
  settings = settings_validator(settings_path);
} catch (e) {
  e.message = settings_path + ': ' + e.message;
  throw e;
}

var settings_plugins_list = settings.plugins;

var source = loadGraph(path.resolve(settings.app_directory));

var hook_manager = new HookManager();

var compiler = new Compiler(hook_manager, source, settings.root_element, argv, settings_plugins_list);

compiler.cData.event_handler_virtual_params_hash = require('../ir_gen/event_handler_virtual_params_hash');
compiler.cData.callback_handler_virtual_params_hash = require('../ir_gen/callback_handler_virtual_params_hash')(compiler.cData.event_handler_virtual_params_hash);

hook_manager.runHook('pre_preprocess', [source], function () {
  preprocess(compiler.cData, source, settings.app_directory, compiler._root_element, hook_manager, function (preprocessed_graph) {
    generate_scopes(compiler.cData, preprocessed_graph, hook_manager, function (scope_data) {
      hook_manager.runHook('pre_code_gen', [scope_data], function () {
        hook_manager.runPipelineHook('pipeline_pre_code_gen', scope_data, function (scope_data) {
          console.log("Generating output script files...");
          hook_manager.runHook('code_gen', [compiler, scope_data], function () {
            hook_manager.runHook('post_code_gen', [], function () {
              process.exit(0);
            });
          });
        });
      });
    });
  });
});

function mapFiles(path, extensionFilter, loadFileFunction) {
  var fileMap = {};
  if (!fs.existsSync(path)) return fileMap;
  walker(path, extensionFilter, function (location) {
    fileMap[location.name] = fs.readFileSync(location.fullPath, 'utf8');
  });
  return fileMap;
}

function loadGraph(app_dir) {
  var elements = mapFiles(path.join(app_dir, 'elements'), '.js');
  var models = mapFiles(path.join(app_dir, 'models'), '.js');
  var views = mapFiles(path.join(app_dir, 'views'), '.hjs');
  var element_templates = mapFiles(path.join(app_dir, 'template_elements'), '.js');
  var model_templates = mapFiles(path.join(app_dir, 'template_models'), '.js');
  var rv = { elements: elements, models: models, views: views, element_templates: element_templates, model_templates: model_templates };
  return rv;
}
