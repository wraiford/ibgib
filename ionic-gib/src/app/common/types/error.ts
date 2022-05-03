import { IbGibRel8ns_V1, IbGib_V1 } from "ts-gib/dist/V1";

/**
 * I format my errors nowadays usually using an id and a possible (unexpected) flag.
 * Sometimes I put the unexpected flag at the beginning, sometimes at the end.
 */
export interface ErrorData_V1 {
    /**
     * raw error message
     */
    raw: string;
    /**
     * I usually have lc's (log contexts) all over my code, if that isn't obvious or
     * if you're not looking at the code. Anyway, I prepend error/info/warning msgs
     * with the location like this:
     *
     * ```
     * [MyClass][Foo] some error (E: hash123)
     * ```
     *
     * So the bits in the brackets are the location. In this case, it's
     * `[MyClass][Foo]` meaning in the function `Foo` on the class `MyClass`.
     */
    location?: string;
    /**
     * error message sans any metadata
     */
    body: string;
    /**
     * if the error is thrown more of an assertion, and it's an edge case just
     * weird error, then I often add `"(UNEXPECTED)"` to the msg. This flag
     * indicates that.
     */
    unexpected?: boolean;
    /**
     * I often include error ids.
     */
    uuid?: string;
}

export interface ErrorRel8ns_V1 extends IbGibRel8ns_V1 {

}

/**
 * Encapsulates data on errors that are thrown in this code base.
 *
 * ## driving intent
 *
 * I'm creating this for error constant ibgibs when I want to wrap an error
 * message in an ibgib for whatever reason.
 *
 * Specifically I'm working on the random robbot and want the ability to return an error
 * or add an error to a context ibgib.
 */
export interface ErrorIbGib_V1 extends IbGib_V1<ErrorData_V1, ErrorRel8ns_V1> {

}
