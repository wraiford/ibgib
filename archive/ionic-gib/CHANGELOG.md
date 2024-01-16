# v0.2.0

## robbots & dynamic forms are begun

Randie -- our first ibgib robbot -- is now in action! A distant cousin of
Robbie, Randie has been a looong time coming.

And in creating Randie, we've started along the path of dynamic, reactive
angular/html forms generated from ibgib data/metadata.

### randie

Randie can look (👀) at any single ibgib by navigating to that ibgib as a
context and hitting the look button on the robbot bar. Randie then remembers
this ibgib by performing a `rel8` transform to the ibgib. When asked to "chat"
by tapping the chat button on the robbot bar, Randie chooses a single ibgib from
his memory and adds it to the current context.

### architecture

* `RobbotBase_V1`
  * extends `WitnessBase_V1` with some additional functionality specific to robbots.
  * gives a robbot witness 3 default commands to accept
    * `RobbotCmd`, of course generically named `ib`, `gib`, and `ibgib`.
    * `RobbotCmdIbGib` wrapping this and other `RobbotCmdData`.
    * a plain, non-cmd ibgib will be interpreted by default as the same as an `ib` cmd.
  * this gives an initial standard for the `RobbotBarComponent` to provide some buttons
    that are common to all robbots.
  * implementing robbot classes can decide how to interpret these, but my current thinking
    is that the `ib` and `gib` cmds are for the two optional main choices, whereas the `ibgib`
    is for more complex processing.
    * for example, Randie's is "look" and "speak" (essentially) corresponding to `ib` and `gib`.
      both of these are single-pass, discrete, clearcut operations directly driven by a user
      action (clicking a button).
    * in the future, the `ibgib` would be "join in the conversation" which requires a different
      approach to processing and more leeway to the robbot.
  * ux
    * `RobbotBarComponent`
      * simple ux bar to interact with/create robbots and the current ibgib context.
    * robbot main menu item
      * list all local robbots
      * navigate to a robbot's ibgib
        * will display all known ibgibs to that robbot.
      * can create a new robbot from this menu section.
* `WitnessFactoryBase`
  * for classes to create witness objects from ibgib data (DTOs).
    * ibgibs are essentially DTOs, as they only have data, no `witness` function.
    * so we must be able to instantiate/hydrate a JavaScript class.
* `DynamicFormFactoryBase`
  * extends the `WitnessFactoryBase` to also go from/to dynamic forms.
  * used in creating/loading dynamic forms per concrete robbot class.

### future

Deceptively simple, this is not just another chatbot architecture. Because all
robbot data/metadata and all derivative data are all ibgib records, now the
robbots and their inputs/outputs can be replicated across synchronization spaces
alongside the rest of the data. And because of the compartmentalization involved
with ibgib projection spaces and their DAG qualities, we can create & even
evolve _with_ sovereign entities. This enables a unification of microservices
and ML "model training" -- and much much more.
