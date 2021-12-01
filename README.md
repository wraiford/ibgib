# ibgib monorepo

## [ionic-gib](./ionic-gib)

**Primary project in this monorepo atm.** 

Ionic (capacitor + angular) project targeting: 
1. SPA web page
2. Android app
3. iOS app
4. FireFox add-on
5. Chrome extension (and other chromium-based browsers)

Most dev is with the web app and extensions atm, but intermittently 
reconciled to target all. This is possible due to the flexibility
of the ibgib architecture/infrastructure being built on top of 
[ts-gib](https://gitlab.com/ibgib/ts-gib), which I have being 
hosted separately on GitLab for the time being.

The entire idea is that ibgib is dogfooding its own hash-based DLT
p2p paradigm using ibgibs, spaces and keystones for identity.

## [keystone-gib](./keystone-gib)

Keystones are hash-based authentication, authorization and identity
that leverage the unique ibgib design to perform these functions
on-chain in a novel approach. Instead of hard-coding out-of-band
certificate authentication, keystones work in-band like other ibgibs
on-chain, providing entirely new functionality that simply does not 
exist in any other system on this planet. 

Read through the project's documentation to get more detail, but 
the closest thing is thinking of 
[current hash-based approaches](https://en.wikipedia.org/wiki/Hash-based_cryptography) like
[eXtended Merkle Signature Schemes](https://en.wikipedia.org/wiki/Hash-based_cryptography)
 and [SPHINCS](https://sphincs.org/), which are hyper-optimized
separate libraries. But since the ibgib architecture already is an ever-expanding
Merkle tree, we can leverage this with providing the zero-knowledge proofs
with on-chain & configurably many-times challenge architectures. 

Or in other words, we can configure challenge/response requirements **on-chain** in
the ibgib Merkle DAG[^1], alongside the actual challenge-secret reveals
data, which itself is also alongside the actual data it's protecting. All
of this works in-band and on-chain, without requiring additional audit 
logs.

(Not to mention that the AI/Microservices can also live alongside in the same
system as well).

That's the idea anyway.

The primary benefit of this (and most of ibgib for that matter) is 
sacrificing more immediate optimizations for less technical
debt and complexity in the long term. Sovereignty allows for local
micro-optimizations.

[^1] Though it's not strictly a DAG, since it has both acyclic AND cyclic 
properties, depending on context.

## [browser-gib](./browser-gib), [chrome](./chrome) & [webext-gib](./webext-gib)

helper exploratory projects for figuring out approaches using web-ext.

