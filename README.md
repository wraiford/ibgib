# ibgib

:eyes: https://ibgib.space - check out the prototype! :eyes:

:under_construction: Major reorg/refactor in progress! :under_construction:

## tl;dr

Ibgib is a DLT approach that enables distributed computation with an
architectural focus on _sovereignty_ and _time_. Its primitives include a unique
content addressing scheme (`ib^gib`), which provides a stronger version of
Merkle links to provide contextualized cryptographic integrity per use case, as
well as enhanced code-as-data & metadata that sits alongside derivative data.
Each datum is like its own repository, which means you have snapshots of data in
time, as well as the timeline of data itself. Timelines can branch to create
other sovereign entities, each with their own timelines. Attention of
participants (human, microservice, ai, bot, iot device, company, etc.) determine
which timelines get extended.

**This enables a completely different approach to distributed computation and collaboration, among all web3/DLT approaches atow.**

_note: ibgib's DLT architecture [evolved parallel](https://en.wikipedia.org/wiki/Parallel_evolution) to Bitcoin.  The common ground was distributed computation, but ibgib did not take an existing thing called a "blockchain" and try to build computation around that. ibgib's content addressing stemmed from the idea of Gödelian numbers via hashes, which came with the added benefit of checksums which extend to entire graphs (& much more)._

## about this repo

This repo is like a monorepo in that it holds the directory structure of the
ibgib source code base, as well as some shared files that are indeed used in
individual libs/app projects (e.g. `tsconfig.base.json`). However, each
individual project has its own repository. So this repo should be cloned first,
and any subsequent project cloned should be placed within the appropriate child
directory. Newly added projects should follow this pattern, as well as added to
the `.gitignore` of this repo.


# ibgib libraries

These libraries have their own repositories (so they will not appear here
if this repo is freshly installed).

## [ts-gib](https://gitlab.com/ibgib/ts-gib)

Lowest level lib that creates raw ibgibs, transforms, etc., which build out
ibgib graphs.

## [core-gib](https://gitlab.com/ibgib/core-gib)

Lib that sits on top of the ts-gib graphing lib to provide opinionated base
class architecture and helpers for creating ibgibs with behavior ("witnesses")
including spaces (dual of "nodes" in many DLTs), apps, robbots and more.

## [encrypt-gib](https://github.com/wraiford/encrypt-gib)

Encryption lib that uses a custom, novel & UNPROVEN (i.e. WEAK) encryption
algorithm that primarily leverages hashes as just-in-time one-time use pads.

_note: It may be considered ["inefficient" at first glance](https://www.reddit.com/r/cryptography/comments/qxlxip/comment/hlas0ci/?utm_source=share&utm_medium=web2x&context=3), but remember, ibgib is about reducing complexity and increasing interoperability/portability. So "efficiency" is not local defined only in execution speed/size terms._


# ibgib apps

## ibgib (CLI)

_note: this is named simply "ibgib" because of a limitation of the node bin executable, OR my limitation of misunderstanding._

## [ionic-gib](./archive/ionic-gib)

Ibgib's prototype app, ionic-gib is an Ionic project, with Capacitor & Angular,
which can target:

1. SPA web page
2. Android app
3. iOS app
4. FireFox add-on
5. Chrome extension (and other chromium-based browsers)

ATOW ionic-gib can be seen in action at https://ibgib.space

_note: ionic-gib is archived because with the current code reorg/refactor, we will be creating a more solid code base._

## [keystone-gib](./archive/keystone-gib)

Keystones are meant to provide an "on-chain" identity mechanism used in
authentication & authorization for humans and non-humans alike, in a
decentralized environment. This is made possible through ibgib's unique DLT
which focuses is on-chain semantic versioning, i.e., cryptographically
reinforced timelines of anything - text, pictures, compositions, collaborations,
etc. Most existing approaches involve a certificate check, which is logged
out-of-band. In contrast, keystones enable on-chain and auditable identity
authentication sigma protocol transcripts using the same Merkle DAG substrate as
the data itself, but without unnecessary additional code complexity cost.

Note that this would simplify both federated identity and PKI systems (which are
essentially an early implementation of DLT architecture).

Check out the [keystone-gib README](./archive/keystone-gib/README.md) for more details.

