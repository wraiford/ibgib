import { FormItemInfo } from "../types/form-items";

/**
 * The idea is that any model can be injected via this factory provider.
 *
 * So when you create a witness that you want to be able to instantiate via
 * just metadata, you also provide an accompanying factory that knows
 * how to map from a
 *   * witness -> form data (to generate dynamic forms)
 *   * form data -> witness (to instantiate witness from data)
 *
 * ## maybe...
 * move this into ibgib-forms and rename to DynamicFormFactory base class.
 */
export abstract class DynamicFormFactoryBase<TModel> {

    // protected lc: string = `[${WitnessBase_V1_Factory.name}]`;
    /**
     * override this with the name that will be used with the injection token.
     */
    abstract getInjectionName(): string;
    /**
     * override this with something that maps from the ibgib/model to the form infos.
     */
    abstract getFormInfos({model}: {model: TModel}): Promise<FormItemInfo[]>;
    /**
     * overrid this with specific behavior that will reify an instance based on
     * the given {@link formInfos}.
     */
    abstract loadFromFormInfos({formInfos}: {formInfos: FormItemInfo[]}): Promise<TModel>
}