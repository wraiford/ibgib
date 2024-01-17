# ibgib

:eyes: https://ibgib.space - check out a prototype web app! :eyes:

# :construction: evolution in progress :construction:

Currently I'm breaking out code from here and solidifying the overall
architectural approach.  This falls into two categories, libs and apps, with
this repo also containing two archived projects, ionic-gib (the prototype) and
keystone-gib (early sketch of a new authentication paradigm).

## libs and apps under this umbrella monorepo

_(to build individual apps from source you will need to clone the foundational
libs into the [libs](/libs) subdirectory and use `npm relink` scripts found in
the projects' package.json files. create an issue for help on this.)_

[libs](/libs):

* active use
  * [helper-gib](https://gitlab.com/ibgib/helper-gib) - common utils
  * [ts-gib](https://gitlab.com/ibgib/ts-gib) - ibgib's unique DLT graphing primitives
  * [core-gib](https://gitlab.com/ibgib/core-gib) - common core functionailty to be used in ibgib front ends
* experimental
  * [encrypt-gib](https://github.com/wraiford/encrypt-gib) - standalone cryptographic library using novel hash-based encryption algorithm
  * [aws-dynamodb-sync-space-gib]() - early sync space adapter (pulled from ionic-gib prototype)
  * [ga-gib]() - possible geometric algebra library for nd-gib front end

[apps](/apps):
  * [ibgib (rcli)](https://gitlab.com/ibgib/ibgib) - rcli front end
    * includes B2tFS Version Control - General Version Control to git's Special Version Control
    * atow (01/2024) this is where I am mostly active
* experimental
  * [nd-gib]() - n-dimensional front end based on graphics + canvas
    * we need a new time ux beyond a scrubber and others in existence
  * [ng-ionic-gib]() - ported ionic-gib prototype
    * (doubt this will happen)
  * [plain-gib]() - vanilla javascript project that i'm using for various reasons
    * early testing libs for isomorphic javascript
