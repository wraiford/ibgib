import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject } from '@angular/core';
// import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

// import { IbgibComponentBase } from '../common/bases/ibgib-component-base';
import { IbGibAddr } from 'ts-gib';
import { CommonService, IbgibNav } from '../services/common.service';
// import { FilesService } from '../services/files.service';
import { IbgibsService } from '../services/ibgibs.service';
// import { Plugins } from '@capacitor/core';
// const { Filesystem } = Plugins;

@Component({
  selector: 'ibgib-browser-action',
  templateUrl: './browser-action.page.html',
  styleUrls: ['./browser-action.page.scss']
})
export class BrowserActionPage implements OnInit, OnDestroy {
  protected lc: string = `[${BrowserActionPage.name}]`;

  constructor(
    protected common: CommonService,
    // protected x: IbgibsService,
    // protected x: FilesService,

    @Inject('IbgibNav') public nav: IbgibNav,
    protected ref: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
  ) {
    // super(common, ref);
    try {
      throw new Error('error here')
    } catch (error) {
      console.error(error.message)
    }
    console.log(`${this.lc} ctor`)
  }


  ngOnInit(): void {
    console.log(`browser action init`)
  }

  ngOnDestroy(): void {
    console.log(`browser action destroyed`)
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    console.log(`${lc} updating...`);
    // try {
    //   await super.updateIbGib(addr);
    //   await this.loadIbGib();
    //   console.log(`${lc} ibGib: ${pretty(this.ibGib)}`);
    //   await this.loadItem();
    // } catch (error) {
    //   console.error(`${lc} error: ${error.message}`);
    //   this.clearItem();
    // } finally {
    //   this.ref.detectChanges();
    //   console.log(`${lc} updated.`);
    // }
  }

}
