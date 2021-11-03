import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { CommonService } from 'src/app/services/common.service';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

@Component({
  selector: 'tag-view',
  templateUrl: './tag-view.component.html',
  styleUrls: ['./tag-view.component.scss'],
})
export class TagViewComponent extends IbgibComponentBase
  implements OnInit {

  protected lc: string = `[${TagViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref)
   }

  ngOnInit() {}

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    console.log(`${lc} updating...`);
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadItem();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      console.log(`${lc} updated.`);
    }
  }


}
