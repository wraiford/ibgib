import { HttpClient, HttpHandler } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlSerializer } from '@angular/router';
import { CommonService, IbgibNav } from 'src/app/services/common.service';
import { IbgibsService } from 'src/app/services/ibgibs.service';
import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
import { IbGibItem } from '../types/ux'; // refactoring to not use types/index
import { IbgibListComponentBase } from './ibgib-list-component-base';
import { AlertController, AngularDelegate, LoadingController, MenuController, ModalController, NavController, Platform } from '@ionic/angular';
import { WitnessFactoriesService } from 'src/app/services/witness-factories.service';
import { InMemoryIbgibCacheService } from 'src/app/services/in-memory-ibgib-cache.service';
import { IonicStorageLatestIbgibCacheService } from 'src/app/services/ionic-storage-latest-ibgib-cache.service';
import { COMMON_TEST_PROVIDERS, getGlobalInjections, getTestBedConfig_Component } from 'src/karma.global';
import { ChatViewComponent } from 'src/app/views/chat-view/chat-view.component';


@Component({
  selector: 'test-list-view',
  template: '<p>yo</p>',
})
class TestList extends IbgibListComponentBase<IbGibItem> {
  /**
   *
   */
  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }
}

describe('IbgibListComponentBase', () => {
  beforeEach(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({
        componentType: ChatViewComponent,
        providers: [
          ...COMMON_TEST_PROVIDERS,
          AngularDelegate,
        ]
      })
    );
  });


  it('should create an instance', () => {
    let fixture = TestBed.createComponent(TestList);
    let component = fixture.componentInstance;
    fixture.detectChanges();
    let { common } = getGlobalInjections();
    common = TestBed.inject(CommonService);
    // changeDetectorRef = TestBed.inject(ChangeDetectorRef);
    expect(component).toBeTruthy();
  });

});
