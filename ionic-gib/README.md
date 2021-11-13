# quick and dirty ibgib mvp

# development

These are notes for development for the various platforms. My memory is not so good.
Always need to clean up `package.json` it seems.

## platforms `npm run` or `package.json` for most up-to-date scripts

ibgib in code is at heart a protocol. The beauty is its ability to live at a high level,
regardless of the execution substrate. As such, we can target any platform that has the following
abilities:

1. Dynamic NoSQL data (e.g. JSON)
2. Put/Get data (repositories)
3. Internodal communication (send)
4. Cryptographic hashing (sha256)

So to start with, we just need somewhere that executes javascript, 
a place to store JSON data, and if we want interwebbing, a means of talking to other 
somewheres that execute javascript. Nothing else.

This makes it "easy" to target multiple platforms, WHICH IS KEY TO THE FUTURE OF 
SOVEREIGN PROGRAMMING. 
Leveraging TypeScript + Angular, the same code can execute not only
single page web apps, but also browser extensions. And utilizing Ionic, we
can add phones and tablets as well.

### localhost:4200 `npm start`

The easiest way to iterate is with a local server. `npm start` executes `ng serve --ssl` (which
watches for changes). 
This starts an http server with `ng`, at https://localhost:4200 and uses
IndexedDB in the browser for the repo.

Note the ssl is required for the cryptographic hashing in some browsers [^1].

### firefox/chrome extensions `npm run watch`, `npm run ff`/`npm run chrome`/`npm run ff:chrome`

Builds with `--aot` in `www` folder and watches for changes. 

**requires** `web-ext` in PATH, and for firefox, a profile called `webext-test`. You can create this at `about:profiles` using the firefox address bar.

The ff/chrome scripts use `web-ext`, which you must have in PATH for the npm script.

### android `npm run start:android`, `npm run sync`

Sometimes I don't seem to get the --live-reload used in `npm run watch:android`,
so I usually end up manually executing sync as-needed.

# notes

[^1]: Had to add --ssl to the ionic serve in order to use the crypto.subtle lib (even though this has nothing to do with encryption)