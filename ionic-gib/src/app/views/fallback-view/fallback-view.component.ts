import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';

@Component({
  selector: 'fallback-view',
  templateUrl: './fallback-view.component.html',
  styleUrls: ['./fallback-view.component.scss'],
})
export class FallbackViewComponent extends IbgibComponentBase
  implements OnInit {

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) { 
    super(common, ref);
  }

  ngOnInit() {

  }

}
