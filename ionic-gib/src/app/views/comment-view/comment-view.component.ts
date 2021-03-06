import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';
import { IbGibAddr } from 'ts-gib';
import { CommentData } from 'src/app/common/types';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'comment-view',
  templateUrl: './comment-view.component.html',
  styleUrls: ['./comment-view.component.scss'],
})
export class CommentViewComponent
  extends IbgibComponentBase
  implements OnInit {

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

