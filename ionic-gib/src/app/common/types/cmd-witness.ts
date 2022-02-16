
/**
 * Cmds for interacting with ibgib spaces.
 *
 * Not all of these will be implemented for every space.
 *
 * ## todo
 *
 * change these commands to better structure, e.g., verb/do/mod, can/get/addrs
 * */
export type CmdWitnessOptionsCmd = 'get' | 'put' | 'delete';
/** Cmds for interacting with ibgib spaces.  */
export const CmdWitnessOptionsCmd = {
    /** Retrieve ibGib(s) out of the space (does not remove them). */
    get: 'get' as CmdWitnessOptionsCmd,
    /** Registers/imports ibGib(s) into the space. */
    put: 'put' as CmdWitnessOptionsCmd,
    /** Delete an ibGib from a space */
    delete: 'delete' as CmdWitnessOptionsCmd,
}

/**
 * Flags to affect the command's interpretation.
 */
export type CmdWitnessOptionsCmdModifier = 'can' | 'addrs' | 'latest';
/**
 * Flags to affect the command's interpretation.
 */
export const CmdWitnessOptionsCmdModifier = {
    /**
     * Only interested if possibility to do command.
     *
     * This can be due to authorization or other.
     */
    can: 'can' as CmdWitnessOptionsCmdModifier,
    /**
     * Only return the addresses of ibgibs
     */
    addrs: 'addrs' as CmdWitnessOptionsCmdModifier,
    /**
     * Only interested in the latest one(s).
     *
     * The incoming addr(s) should be the tjp(s), since "latest"
     * only makes sense with unique timelines which are referenced by
     * their tjps.
     *
     * ## notes
     *
     * ATOW I'm actually using this in the aws dynamodb ibgib space to
     * get "newer" ibgibs, not just the latest.
     */
    latest: 'latest' as CmdWitnessOptionsCmdModifier,
}