import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHandler } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Router, UrlSerializer } from '@angular/router';

import { ROOT, ROOT_ADDR } from 'ts-gib/dist/V1';

import { CommonService, IbgibNav } from 'src/app/services/common.service';
import { IbgibsService } from 'src/app/services/ibgibs.service';
import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
import {
  AlertController, LoadingController, MenuController, ModalController, NavController, Platform
} from '@ionic/angular';
import { WitnessFactoriesService } from 'src/app/services/witness-factories.service';
import { InMemoryIbgibCacheService } from 'src/app/services/in-memory-ibgib-cache.service';
import { IonicStorageLatestIbgibCacheService } from 'src/app/services/ionic-storage-latest-ibgib-cache.service';

import { TagViewComponent } from './tag-view.component';

describe('', () => {

  beforeEach(async(() => {
  }));

  it('should create', () => {
  });
});

fdescribe('TagViewComponent', () => {
  let component: TagViewComponent;
  let fixture: ComponentFixture<TagViewComponent>;

  let nav: IbgibNav;
  let changeDetectorRef: ChangeDetectorRef;
  let modalController: ModalController;
  let platform: Platform;
  let factories: WitnessFactoriesService;
  let alertController: AlertController;
  let cache: InMemoryIbgibCacheService;
  let getLatestCache: IonicStorageLatestIbgibCacheService;
  let menuCtrl: MenuController;
  let loadingCtrl: LoadingController;
  let ibgibs: IbgibsService;
  let common: CommonService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TagViewComponent],
      imports: [IonicModule.forRoot()],
      providers: [
        HttpHandler, Router, HttpClient, UrlSerializer,
        NavController, MenuController, LoadingController, AlertController,
        ChangeDetectorRef,
        // ModalController,
        Platform,
        { provide: 'IbgibNav', useValue: new IonicIbgibNavService(null), }, // not sure when this will make a difference
        // { provide: 'IbgibNav', useClass: IonicIbgibNavService, }, // doesn't work ?
        WitnessFactoriesService,
        InMemoryIbgibCacheService,
        { provide: 'IbGibCacheService', useClass: IonicStorageLatestIbgibCacheService },
        IbgibsService,
        CommonService,
      ]

    }).compileComponents();

    changeDetectorRef = TestBed.inject(ChangeDetectorRef);

    menuCtrl = TestBed.inject(MenuController);
    loadingCtrl = TestBed.inject(LoadingController);
    alertController = TestBed.inject(AlertController);
    modalController = TestBed.inject(ModalController);
    platform = TestBed.inject(Platform);

    nav = TestBed.inject('IbgibNav' as any);
    factories = TestBed.inject(WitnessFactoriesService);

    cache = TestBed.inject(InMemoryIbgibCacheService);
    getLatestCache = TestBed.inject(IonicStorageLatestIbgibCacheService);

    ibgibs = TestBed.inject(IbgibsService);
    common = TestBed.inject(CommonService);
    // common = new CommonService(
    //   ibgibs, modalController, nav, platform, factories, alertController, cache,
    //   getLatestCache, menuCtrl, loadingCtrl
    // );

    fixture = TestBed.createComponent(TagViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });


  it('should create an instance', async () => {

    expect(true).toBeTruthy();
    // fixture = TestBed.createComponent(TagViewComponent);
    // component = fixture.componentInstance;
    expect(component).toBeTruthy();
    await component.updateIbGib(ROOT_ADDR);
    expect(component.addr).toEqual(ROOT_ADDR);
    let t = { ...ROOT };
    expect(component.ibGib).toEqual(t);
    expect(common.platform).toBeTruthy();
    expect(common.platform.is('desktop')).toBeTruthy();

    // expect(component.ibGib).toBeFalsy();
    // await nav.go({ toAddr: 'ib^gib' });

    // common = TestBed.inject(CommonService);
    // changeDetectorRef = TestBed.inject(ChangeDetectorRef);
    // expect(new TestList(common, changeDetectorRef)).toBeTruthy();
    // expect(true).toBeTruthy();
  });

});
