"use strict";
/* global it, describe, beforeEach, afterEach */

var assert = require("chai").assert;
var Compiler = require('../../compiler');
var HookManager = require('../../hook_manager');

describe('Compiler', function() {
  var hookManager;
  var source;
  var root_element;
  var argv;

  beforeEach(function() {
    hookManager = new HookManager();
    source = {
      elements: { test: 'element code' },
      models: { test_model: 'model code' },
      views: { test: 'view code' },
      element_templates: {},
      model_templates: {}
    };
    root_element = 'test';
    argv = {};
  });

  describe('constructor', function() {
    it('should create a Compiler instance', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.instanceOf(compiler, Compiler);
    });

    it('should store source reference', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.strictEqual(compiler._source, source);
    });

    it('should store root_element reference', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.equal(compiler._root_element, root_element);
    });

    it('should store hook_manager reference', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.strictEqual(compiler._hook_manager, hookManager);
    });

    it('should initialize cData with sort_refs', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.isObject(compiler.cData);
      assert.isObject(compiler.cData.sort_refs);
      assert.property(compiler.cData.sort_refs, 'helpers');
    });

    it('should handle empty plugin list', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.instanceOf(compiler, Compiler);
    });

    it('should load plugins with path string', function() {
      // Create a simple mock plugin
      var mockPluginPath = './tests/fixtures/mock_plugin';
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');
      var pluginFile = path.join(pluginDir, 'mock_plugin.js');

      // Create fixtures directory if it doesn't exist
      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      // Create a simple mock plugin
      fs.writeFileSync(pluginFile,
        '"use strict";\n' +
        'function MockPlugin(hook_manager, settings, argv, cData) {\n' +
        '  this.loaded = true;\n' +
        '  cData.mock_plugin_loaded = true;\n' +
        '}\n' +
        'module.exports = MockPlugin;\n'
      );

      try {
        var compiler = new Compiler(hookManager, source, root_element, argv, [mockPluginPath]);
        assert.equal(compiler.cData.mock_plugin_loaded, true);
      } finally {
        // Cleanup
        fs.unlinkSync(pluginFile);
      }
    });

    it('should load plugins with path and settings object', function() {
      var mockPluginPath = './tests/fixtures/mock_plugin_with_settings';
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');
      var pluginFile = path.join(pluginDir, 'mock_plugin_with_settings.js');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      fs.writeFileSync(pluginFile,
        '"use strict";\n' +
        'function MockPlugin(hook_manager, settings, argv, cData) {\n' +
        '  cData.plugin_settings = settings;\n' +
        '}\n' +
        'module.exports = MockPlugin;\n'
      );

      try {
        var pluginSettings = { option: 'value' };
        var compiler = new Compiler(hookManager, source, root_element, argv, [
          { path: mockPluginPath, settings: pluginSettings }
        ]);
        assert.deepEqual(compiler.cData.plugin_settings, pluginSettings);
      } finally {
        fs.unlinkSync(pluginFile);
      }
    });

    it('should load multiple plugins in order', function() {
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      var plugin1File = path.join(pluginDir, 'mock_plugin_1.js');
      var plugin2File = path.join(pluginDir, 'mock_plugin_2.js');

      fs.writeFileSync(plugin1File,
        '"use strict";\n' +
        'function Plugin1(hook_manager, settings, argv, cData) {\n' +
        '  if (!cData.load_order) cData.load_order = [];\n' +
        '  cData.load_order.push(1);\n' +
        '}\n' +
        'module.exports = Plugin1;\n'
      );

      fs.writeFileSync(plugin2File,
        '"use strict";\n' +
        'function Plugin2(hook_manager, settings, argv, cData) {\n' +
        '  if (!cData.load_order) cData.load_order = [];\n' +
        '  cData.load_order.push(2);\n' +
        '}\n' +
        'module.exports = Plugin2;\n'
      );

      try {
        var compiler = new Compiler(hookManager, source, root_element, argv, [
          './tests/fixtures/mock_plugin_1',
          './tests/fixtures/mock_plugin_2'
        ]);
        assert.deepEqual(compiler.cData.load_order, [1, 2]);
      } finally {
        fs.unlinkSync(plugin1File);
        fs.unlinkSync(plugin2File);
      }
    });

    it('should pass argv to plugins', function() {
      var mockPluginPath = './tests/fixtures/mock_plugin_argv';
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');
      var pluginFile = path.join(pluginDir, 'mock_plugin_argv.js');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      fs.writeFileSync(pluginFile,
        '"use strict";\n' +
        'function MockPlugin(hook_manager, settings, argv, cData) {\n' +
        '  cData.received_argv = argv;\n' +
        '}\n' +
        'module.exports = MockPlugin;\n'
      );

      try {
        var testArgv = { option: 'test', flag: true };
        var compiler = new Compiler(hookManager, source, root_element, testArgv, [mockPluginPath]);
        assert.deepEqual(compiler.cData.received_argv, testArgv);
      } finally {
        fs.unlinkSync(pluginFile);
      }
    });
  });

  describe('source structure', function() {
    it('should accept source with all required properties', function() {
      var fullSource = {
        elements: { main: 'code' },
        models: { user: 'code' },
        views: { main: 'html' },
        element_templates: { button: 'code' },
        model_templates: { base: 'code' }
      };
      var compiler = new Compiler(hookManager, fullSource, 'main', argv, []);
      assert.strictEqual(compiler._source, fullSource);
    });

    it('should accept source with empty collections', function() {
      var emptySource = {
        elements: {},
        models: {},
        views: {},
        element_templates: {},
        model_templates: {}
      };
      var compiler = new Compiler(hookManager, emptySource, 'test', argv, []);
      assert.strictEqual(compiler._source, emptySource);
    });
  });
});
