# Coral.js

Coral.js is an extensible, functional-reactive framework. The design of Coral.js encourages maintainable front-end code for your ambitious single-page applications.

Coral.js is an open source project of [LockerDome](https://lockerdome.com). It is thanks to all [these contributions](https://github.com/lockerdome/coral.js/blob/master/CONTRIBUTION_HISTORY_PRE_OPEN_SOURCE.md) that the Coral.js framework has reached the milestone of being open sourced.

### Table of Contents

* [Getting Started](#getting_started)
  * [Prerequisites and Compatibility](#prerequisites_and_compatibility)
  * [Installation](#installation)
  * [Demos](#demos)
* [Using Coral.js](#using_coral)
  * [An Example Project](#an_example_project)
    * [Directory Structure](#directory_structure)
    * [Overview of File Contents](#overview_of_file_contents)
    * [Compiling Your App](#compiling_your_app)
  * [Plugins](#plugins)
* [Learning More About Coral.js](#learning_more)
* [Contributing to Coral.js](#contributing)
* [License](#license)

# <a name="getting_started"></a> Getting Started

### <a name="prerequisites_and_compatibility"></a> Prerequisites and Compatibility
* Coral.js generates JavaScript which can be used in any modern browser and IE9+.
* The Coral.js compiler supports versions of Node.js 0.8 and above.


### <a name="installation"></a> Installation

`$ npm install --save @lockerdome/coral.js`


### <a name="demos"></a> Demos

Visit and download our [coral.js-tutorials](https://github.com/lockerdome/coral.js-tutorials) repo. It contains:
  * A sample Hello, world! app.
  * A variety of demos which showcase some of the different features of the Coral.js framework.

# <a name="using_coral"></a> Using Coral.js

This section is for those of you who want to make something with Coral.js.

**There are two main steps:**
1. Write the app code.
2. Run the compiler to build your app.

## <a name="an_example_project"></a> An Example Project

Using the example of a basic Hello, world! app, this section describes:

* [Directory Structure](#directory_structure)
* [Overview of File Contents](#overview_of_file_contents)
* [Compiling Your App](#compiling_your_app)

### <a name="directory_structure"></a> Directory Structure

This is a simple example of a directory structure for a web app that uses Coral.js:

* your_project/
  * node_modules/
    * @lockerdome/coral.js/
  * app/
    * elements/
      * [main.js](#app_elements_main_js)
    * views/
      * [main.hjs](#app_views_main_hjs)
  * static/
      * [index.html](#static_index_html)
      * coral_shards/
          * [coral.js](#compiling_your_app)
  * [compiler_settings.js](#compiler_settings_js)  

### <a name="overview_of_file_contents"></a> Overview of File Contents

#### <a name="static_index_html"></a> static/index.html

``` html
<html>
  <head>
    <title>Your Coral.js App</title>
  </head>
  <body>
    <div id="app"></div>
    <script charset="utf-8" src="coral_shards/coral.js"></script>
    <script>new Coral(document.getElementById('app'), {});</script>
  </body>
</html>
```
Explanation of the above example:

`<div id="app"></div>` is the entry point (a.k.a. "root") element. This is where the Coral.js app will be rendered.

`<script charset="utf-8" src="coral_shards/coral.js"></script>` coral.js is a script that Coral.js compiles from your app code. The compilation step is described [here](#compiling_your_app).

`<script>new Coral(document.getElementById('app'), {});</script>` places your Coral.js app in the DOM in the div with the id of 'app'.

#### <a name="app_elements_main_js"></a> app/elements/main.js:

In this example, 'main' is the root_element (see [compiler_settings.js](#compiler_settings_js)) of the Coral.js app.

``` js
var main = {
  // ... more code for the 'main' element can go here
};
```


This Element has a corresponding View file: app/views/main.hjs.

#### <a name="app_views_main_hjs"></a> app/views/main.hjs

All Views correspond to an element. This one matches: app/elements/main.js

Views may contain HTML markup and HTML templates. The example below simply uses plain text.

``` html
Hello, world!
```

#### <a name="compiler_settings_js"></a> compiler_settings.js

This is where compiler settings and Plugins are specified.

Top level keys:
* `app_directory:` The path to the web app's framework code
* `root_element:` The name of the entry point (a.k.a. root) element.
* `plugins:` An array of compiler Plugins to use and their configurations. Plugins are where you are able to customize your app's behaviour. Read more about Plugins [here](#plugins).

This is enough to get you started:

``` js
var settings = {

  app_directory: 'app', // Refers to your_project/app
  root_element: 'main', // Refers to your_project/app/elements/main.js

  plugins: [
    {
      // compile_client_app is a standard compiler Plugin that is included with Coral.js.
      path: './node_modules/@lockerdome/coral.js/plugins/compile_client_app',
      settings: {
        shard_output_directory: 'static/coral_shards' // Where the generated coral.js goes.
      }
    }
  ]

};

module.exports = settings;
```

### <a name="compiling_your_app"></a> Compiling Your App

The Coral.js app code you write needs to be compiled so that the appropriate script file(s) (e.g. coral.js) can be generated and referenced in a script tag (e.g. in [static/index.html](#static_index_html)).

Front-end code generation is handled by one of Coral.js's standard compiler Plugins, [compile_client_app](https://github.com/lockerdome/coral.js/tree/master/plugins/compile_client_app), and the output script is specified in [compiler_settings.js](#compiler_settings_js)

Compilation is done from the command line like so:

`$ node [path_to_coral/cli/cli.js] --s [path_to_compiler_settings.js]`

Example:

`$ node ./node_modules/@lockerdome/coral.js/cli/cli.js --s compiler_settings.js`
## <a name="plugins"></a> Plugins

Coral.js apps and the Coral.js framework itself are extensible. Plugins enable you to customize your app and/or the framework's behaviour in many different ways.

Coral.js comes with two standard compiler Plugins:
* [compile_client_app](https://github.com/lockerdome/coral.js/tree/master/plugins/compile_client_app) generates the front-end script file(s) for your web app.
* [standard_optimizations](https://github.com/lockerdome/coral.js/tree/master/plugins/standard_optimizations) is a standard set of optional optimizations


and run in the order listed in the `plugins:` array.

E.g. Specifying Plugins in compiler_settings.js:
``` js
var settings = {
  ...
  plugins: [
    ...
    {
      path: './node_modules/@lockerdome/coral.js/plugins/standard_optimizations'
    },
    {
      path: './node_modules/@lockerdome/coral.js/plugins/compile_client_app',
      settings: {
        shard_output_directory: 'static/coral_shards'
      }
    },
    ...
  ]
  ...
};


```

# <a name="learning_more"></a> Learning More

To see more of Coral.js's features and get up to speed on building your own single page web app with Coral.js, visit the [coral.js-tutorials](https://github.com/lockerdome/coral.js-tutorials) repo and look through the demo app.

# <a name="contributing"></a> Contributing

Coral.js is an open source project and we gladly welcome contributions.

Before submitting a pull request, you'll need to make sure you [sign the CLA](https://lockerdome.com/cla).

Please read [our guide](https://github.com/lockerdome/coral.js/blob/master/CONTRIBUTING.md) on contributing for additional information.

# <a name="license"></a> License

Coral.js is [MIT licensed](https://github.com/lockerdome/coral.js/blob/master/LICENSE).
