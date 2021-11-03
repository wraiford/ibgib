import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

@Component({
  selector: 'fallback-view',
  templateUrl: './fallback-view.component.html',
  styleUrls: ['./fallback-view.component.scss'],
})
export class FallbackViewComponent extends IbgibComponentBase
  implements OnInit {

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
    super(common, ref);
  }

  ngOnInit() {

  }

}
