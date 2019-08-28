The Coral.js framework originated with the development of the 3.0 version of the lockerdome.com site and embeds.  Coral.js enabled LockerDome's developers to rapidly build out the new front-end for LockerDome 3.0.  After the release of LockerDome 3.0 Coral.js continued to power the lockerdome.com site and embeds and evolve over time to fit the needs of LockerDome.

As part of the process of open sourcing the Coral.js framework, the commit history had to be wiped.  This document is an abridged history of the contributions of those involved before the open source release to make up for having to wipe the commit history.


## Pre-Open Source Release Contribution History


### Initial Version Of Framework For LockerDome 3.0 (2013)


Perrin Westrich ([@CrypticSwarm](https://github.com/CrypticSwarm)) and Mouna Apperson ([@nick-apperson](https://github.com/nick-apperson))
  - Designed and developed the initial version of the framework, which was utilized by the development team to rapidly develop the front-end for the LockerDome 3.0 release


### After LockerDome 3.0 release (2014 - May 2015)


Perrin Westrich ([@CrypticSwarm](https://github.com/CrypticSwarm))
  - Optimizations, improvements and cleanups for the generated code
  - Improved validations performed by static code analysis
  - Emitted event support
  - Various improvements and fixes

Preston Skupinski ([@pskupinski](https://github.com/pskupinski))
  - Usability improvements (showWhen elements, computed variables, dynamic element list single option "item" syntax, implicit parameters)

Mouna Apperson ([@nick-apperson](https://github.com/nick-apperson))
  - Optimizations for generated code


### Framework Rework (May 2015 - Jan 2016)


Preston Skupinski ([@pskupinski](https://github.com/pskupinski))
  -  Wrote computable IR layer and reworked framework around the computable IR layer.  Wrote packed args style front-end code gen.  Wrote update cycle management layer based around zones.  Architecture guidance by Mouna Apperson ([@nick-apperson](https://github.com/nick-apperson)).

Harry Gallagher ([@harrygallagher4](https://github.com/harrygallagher4))
  - Bug fixes in base computable
  - Wired up initial optimizations that operate on the computable IR (drop unused scopes, drop unused computables, inlining single use scopes)


### Post Framework Rework (Jan 2016 - May 2016)


Chip Belpedio ([@chipbroze](https://github.com/chipbroze))
  - Framework bug fixes
  - Improved validations performed by static code analysis
  - Improved framework error messages to include context in terms of what element/model and reference when validation errors are run into on compile

Preston Skupinski ([@pskupinski](https://github.com/pskupinski))
  - Framework bug fixes
  - Behavior improvements in cases many updates arrive in one update cycle for a single symbol


### Sharding Support (May 2016 - July 2016)


Chip Belpedio ([@chipbroze](https://github.com/chipbroze))
  - Wired up deps support for elements, allowing javascript and css files to be loaded on demand as part of the async initialization of the element
  - Added optimization for pushing deps to shard roots
  - Wired up aggregate shard support

Preston Skupinski ([@pskupinski](https://github.com/pskupinski))
  - Wired up initial sharding support


### Framework Improvements (July 2016 - Aug 2017)


Chip Belpedio ([@chipbroze](https://github.com/chipbroze))
  - Framework bug fixes
  - Optimizations for generated code
  - Support for `is` and `from` parameter annotations
  - Reduced size of generated code
  - Revamped inline single use scopes optimization
  - Allow constant macro to work in template elements
  - Improved error message handling across compiler to properly include context
  - Wired up optimization to pushdown computables to scopes that use them when not used in original scope

Jeffrey Yoo ([@screenshotjy](https://github.com/screenshotjy))
  - Improved validations performed by static code analysis
  - Keyboard shortcut handling
  - Output type introspection for computed variables and model functions, gives the static code analysis better insight on output types without a developer needing to manually specify the output type
  - Inline trivial scopes optimization

Preston Skupinski ([@pskupinski](https://github.com/pskupinski))
  - Framework bug fixes
  - Optimizations for generated code

Alexander Bolinsky ([@abolinsky](https://github.com/abolinsky))
  - Improved validations performed by static code analysis
  - Cleaned up Observable change handlers on element cleanup when they are added in event handlers


### jQuery Dependency Removal (August 2017)


Preston Skupinski ([@pskupinski](https://github.com/pskupinski)) and Margaret Liu ([@margsliu](https://github.com/margsliu))
  - Remove usage of jQuery from the framework, replacing some behavior that was jQuery dependent with versions that did not rely on jQuery


### Framework Improvements (August 2017 - February 2018)


Preston Skupinski ([@pskupinski](https://github.com/pskupinski))
  - Framework bug fixes
  - Add support for reference lookups in path expressions for args
  - Reworked environment handling to resolve shortcomings of prior implementation

Margaret Liu ([@margsliu](https://github.com/margsliu))
  - Improved validations performed by static code analysis
  - Framework bug fixes
  - Updated checks and defaulting for whether parameter is considered invariant or not
  - `unpacked` parameter annotation


### Plugin Architecture (February 2018 - June 2018)


Margaret Liu ([@margsliu](https://github.com/margsliu))
  - Wired up plugin architecture for the framework.  Framework plugins can introduce functionality and customize the framework using hooks throughout the compilation process.  This allowed LockerDome specific functionality to be pulled out of the core framework across any web project that could use a front-end framework.  This marked the beginning of the framework being reusable.  Architecture guidance by Preston Skupinski ([@pskupinski](https://github.com/pskupinski)).
  - Pulled LockerDome specific functionality out of the core framework

Preston Skupinski ([@pskupinski](https://github.com/pskupinski))
  - Pulled LockerDome specific functionality out of the core framework


### Features, Bug Fixes and Cleanups Before Open Source Release (June 2018 - August 2019)


Preston Skupinski ([@pskupinski](https://github.com/pskupinski))
  - Framework bug fixes
  - Code cleanups to bring the code base into a shape that is ready to open source
  - Added features oriented around usability improvements.  Notable features added were view expressions, two way binding in the view, async model functions, async computed variables, and a simple way to specify inline elements and models.

Margaret Liu ([@margsliu](https://github.com/margsliu))
  - Cleaned up framework global allocation to only use a single Coral.js global, placing allocated symbols within that one global and moving various helpers onto that global
  - Various error message improvements
  - Pulled LockerDome specific functionality out of the core framework

Perrin Westrich ([@CrypticSwarm](https://github.com/CrypticSwarm))
  - Cleaned up the IR generation code and hook manager code
  - Pulled LockerDome specific functionality out of the core framework


## Thank You


It is thanks to all these contributions that the Coral.js framework has reached the milestone of being open sourced.

For all those involved, please list your name and a link to your github account below:

Preston Skupinski ([@pskupinski](https://github.com/pskupinski))
Margaret Liu ([@margsliu](https://github.com/margsliu))
Perrin Westrich ([@CrypticSwarm](https://github.com/CrypticSwarm))
