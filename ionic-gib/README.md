# quick and dirty ibgib mvp

ibgib in code is at heart a decentralized DLT protocol [^1]. Its strength is in
its ability ability to live **simply** at a high application level, regardless
of the execution/communication substrate, with as little local pre-optimization
as possible. Or more tersely, it minimizes local optimization to maximize
interoperability.

As such, we can target any platform that has the following abilities:

1. Dynamic NoSQL data (e.g. JSON)
2. Cryptographic hashing (e.g. sha256)
3. Put/Get data (spaces to store data)
4. Internodal communication (send/receive among spaces)

So to start with, we just need somewhere that executes javascript + JSON, a
"local space"[^2] to store that JSON, and interspatial communication adapters to
exchange data among spaces. Nothing else.

With this focus on simplicity in mind, we enable things such as consensus
algorithms, requirements, schemas, specifications, and more - things that
currently stored out-of-band and off-chain in version control repositories or
separate databases - to coexist alongside the data **in-band and on-chain**.

# development

These are notes for development for the various platforms.

Always refer to `package.json` for the most up-to-date information,
and I often use a bare `npm run` command to list the scripts for me
when needed.

## dependencies

All of these is assuming you've cloned the entire ibgib repo but that
**you are in the working directory inside the ionic-gib project folder.**

* node v16
  * I use [nvm](https://github.com/nvm-sh/nvm) on my mac to install versions of node.
  * v17+ may also work
* `npm install` inside ionic-gib folder
  * Check out [package.json](./package.json) for the list, which atow includes only...
    * aws sdk clients for s3 and dynamodb
    * ionic, capacitor & angular
    * rxjs, zone.js and tslib
    * ts-gib, encrypt-gib
    * additional dev dependencies
      * karma, jasmine and their @types
      * protractor, codelyzer
      * ts-node, tslib, typescript
* angular installed globally
  * possibly not needed globally...?
  * `npm install -g @angular@13`
  * cli is already installed locally as dev dependency
* ionic v6 installed globally
  * https://ionicframework.com/docs/intro/cli
  * `npm install -g @ionic/cli`
* [web-ext](https://github.com/mozilla/web-ext) installed globally



## dev using the web server, https://localhost:4200

This is by far the fastest and easiest way to iterate the code.
The script `npm start` executes `ng serve --ssl` (which watches for changes).
This starts an http server with `ng`, at https://localhost:4200 and uses
IndexedDB in the browser (profile) for the local space.

Note that ssl (https) is required for the cryptographic hashing in some browsers [^3].

I usually this in combination with `npm run ff` & variants (mentioned below) to
start the browser instance(s), even when not testing extensions/addons.

### dev using android

Android is a slightly longer iteration cycle, and I use it only
after first making changes usually with the web server.

I usually use `npm run start:android` to get the environment up and
going, and then `npm run sync:android` after making code changes.
(Because I don't seem to get the `--live-reload` used in `npm run watch:android`
working correctly, so I usually end up manually executing sync per iteration
cycle.)

### firefox/chrome extensions/addons

We can target not only web, android and ios, but also extensions/addons for
firefox and chrome (and possibly other gecko/chromium-based browsers, but not
tested). This uses the extension's IndexedDb storage, and when you add sync
spaces - whose configurations are stored as encrypted ibgibs alongside all your
other ibgibs that IndexedDB storage...when you add these sync spaces, the
extensions/addons can interact just the same with the other web, android and ios
interfaces.

Targeting extensions uses `web-ext`.
**This requires `web-ext` to be in `PATH`.**

Here are descriptions of the extension scripts that I use the most in
`package.json` (look at the file for the most up-to-date scripts):

* `npm run watch`
  * Builds with `--aot` in `www` folder and watches for changes for "live"
    reloads.
    * When testing extensions, you will have to open a new background.js script
      via the action browser button to use changes in the build.
* `npm run ff:createprofiles`
  * creates test profiles that we will use when testing with ff when we want to
    persist data between test firefox sessions.
  * You can delete this via firefox browser at `about:profiles` in URL bar
    * (there is no FF CLI option to delete profiles)
* `npm run ff`
  * alias for `npm run ff:profile:1`
  * Opens a new instance of firefox when profile `ibgibtest1` (created by
    `npm run ff:createprofiles`).
  * Use `npm run ff:profile:1`, `npm run ff:profile:2` & `npm run ff:profile:3`
    to emulate multiple different simultaneous participants in ibgib chats.
* `npm run ff:chrome` for testing both simultaneously.

#### known issues

* when hitting duplicate tab when using an extension, it doesn't know how to load the ibgib.
  * https://discourse.mozilla.org/t/extension-development-routing/95112

## firefox on android

* https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/#set-up-your-computer-and-android-emulator-or-device
  * example command: `web-ext run -s './www' -t firefox-android --adb-device XXX --firefox-apk org.mozilla.fenix`
  * i've added a partial script in `package.json`

# local workspace settings

While working on the project alone, I keep different editor colors for
differentiating among vscode windows. I'm open to changing this if it offends,
just let me know.

# android

* when asked for fingerprint, you can find the current fingerprint via cli:
  * ```
    adb pubkey ~/.android/adbkey | awk '{print $1}' \
    | openssl base64 -A -a -d | openssl md5 -c | tr a-z A-Z
    ```

# ios

* we added `--generate-entitlement-der` in order to deploy to actual ios device.

# extending webpack config

I've currently got what looks to be a circular dependency problem and have
installed the `ngx-build-plus` package to extend the webpack config. This can be
found in `webpack.partial.js`.

As a sidenote, I tried the `circular-dependency-plugin` but it didn't detect the
circularity (or any for that matter). Might be a problem with
ionic/angular-specific blindness.

## testing

Testing uses Karma + Jasmine. Any file that ends with *.spec.ts will be included automatically.

If you want to limit your tests, you can change any `describe` or `it` clauses
to `fdescribe`/`fit`.  This tells the test runner to only execute those specs.

# notes

[^1]: A DLT technology, but not coming from the blockchain/Bitcoin paradigm; rather it has been a separate evolutionary path to address issues of massively parallel execution more akin to Event Sourcing (if anything) with content address hashes being Gödelian number addresses across infinite address spaces.
[^2]: A "local space" interfaces with other local spaces via "outerspace" adapter instances, with each local and outer space itself being an ibgib.
[^3]: Had to add --ssl to the ionic serve in order to use the crypto.subtle lib (even though this has nothing to do with encryption)
