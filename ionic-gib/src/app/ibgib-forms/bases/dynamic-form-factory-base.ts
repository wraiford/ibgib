import { DynamicForm, FormItemInfo } from "../types/form-items";

/**
 * The idea is that any model can be injected via this factory provider.
 *
 * So when you create a witness that you want to be able to instantiate via
 * just metadata, you also provide an accompanying factory that knows
 * how to map from a
 *   * witness(model) -> form data (to generate dynamic forms)
 *   * form data -> witness (to instantiate witness from data)
 */
export abstract class DynamicFormFactoryBase<TWitness> {
    /**
     * override this with the name that will be used with the injection token.
     */
    abstract getInjectionName(): string;
    /**
     * override this with something that maps from the ibgib/model to the form infos.
     */
    abstract witnessToForm({witness}: {witness: TWitness}): Promise<DynamicForm>;
    /**
     * override this with specific behavior that will reify an instance based on
     * the given {@link form}.
     */
    abstract formToWitness({form}: {form: DynamicForm}): Promise<TWitness>
}
