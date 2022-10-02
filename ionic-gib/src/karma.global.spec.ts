// import { async, ComponentFixture, TestBed } from '@angular/core/testing';
// import { IonicModule } from '@ionic/angular';
// import { HttpClient, HttpHandler } from '@angular/common/http';
// import { ChangeDetectorRef } from '@angular/core';
// import { Router, UrlSerializer } from '@angular/router';

// import { ROOT, ROOT_ADDR } from 'ts-gib/dist/V1';
// import * as h from 'ts-gib/dist/helper';

// import { CommonService, IbgibNav } from 'src/app/services/common.service';
// import { IbgibsService } from 'src/app/services/ibgibs.service';
// import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
// import {
//     AlertController, LoadingController, MenuController, ModalController, NavController, Platform
// } from '@ionic/angular';
// import { WitnessFactoriesService } from 'src/app/services/witness-factories.service';
// import { InMemoryIbgibCacheService } from 'src/app/services/in-memory-ibgib-cache.service';
// import { IonicStorageLatestIbgibCacheService } from 'src/app/services/ionic-storage-latest-ibgib-cache.service';
// // import { TagViewComponent } from './app/views/tag-view/tag-view.component';

// // import { TagViewComponent } from './tag-view.component';

// // describe('testing globalIbGibTest foreach', () => {

// //     beforeEach(() => {
// //         console.log('hello')
// //     });

// //     it('should create', () => {
// //         // expect(true).toBeFalse();
// //     });
// // });

// console.log('YOOOoooooooo')
// var globalIbGibTest: any = {
//     test: 'testing yow',
//     providers: [
//         HttpHandler, Router, HttpClient, UrlSerializer,
//         NavController, MenuController, LoadingController, AlertController,
//         ChangeDetectorRef, ModalController,
//         Platform,
//         { provide: 'IbgibNav', useValue: new IonicIbgibNavService(null), }, // not sure when this will make a difference
//         // { provide: 'IbgibNav', useClass: IonicIbgibNavService, }, // doesn't work ?
//         WitnessFactoriesService,
//         InMemoryIbgibCacheService,
//         { provide: 'IbGibCacheService', useClass: IonicStorageLatestIbgibCacheService },
//         IbgibsService,
//         CommonService,
//     ]
// };
// (<any>window).globalIbGibTest = globalIbGibTest;

// // var component: TagViewComponent;
// // var fixture: ComponentFixture<TagViewComponent>;
// // var nav: IbgibNav;
// // var changeDetectorRef: ChangeDetectorRef;
// // var modalController: ModalController;
// // var platform: Platform;
// // var factories: WitnessFactoriesService;
// // var alertController: AlertController;
// // var cache: InMemoryIbgibCacheService;
// // var getLatestCache: IonicStorageLatestIbgibCacheService;
// // var menuCtrl: MenuController;
// // var loadingCtrl: LoadingController;
// // var ibgibs: IbgibsService;
// // var common: CommonService;
// beforeEach(() => {
//     const lc = `[karma-globalIbGibTest][beforeEach]`;
//     // console.log(`${lc} global: ${h.pretty((<any>window).globalIbGibTest)}`)

//     // TestBed.configureTestingModule({
//     //     declarations: [TagViewComponent],
//     //     imports: [IonicModule.forRoot()],
//     //     providers: [
//     //         HttpHandler, Router, HttpClient, UrlSerializer,
//     //         NavController, MenuController, LoadingController, AlertController,
//     //         ChangeDetectorRef,
//     //         // ModalController,
//     //         Platform,
//     //         { provide: 'IbgibNav', useValue: new IonicIbgibNavService(null), }, // not sure when this will make a difference
//     //         // { provide: 'IbgibNav', useClass: IonicIbgibNavService, }, // doesn't work ?
//     //         WitnessFactoriesService,
//     //         InMemoryIbgibCacheService,
//     //         { provide: 'IbGibCacheService', useClass: IonicStorageLatestIbgibCacheService },
//     //         IbgibsService,
//     //         CommonService,
//     //     ]

//     // }).compileComponents();

//     // globalIbGibTest.changeDetectorRef = TestBed.inject(ChangeDetectorRef);

//     // globalIbGibTest.menuCtrl = TestBed.inject(MenuController);
//     // globalIbGibTest.loadingCtrl = TestBed.inject(LoadingController);
//     // globalIbGibTest.alertController = TestBed.inject(AlertController);
//     // globalIbGibTest.modalController = TestBed.inject(ModalController);
//     // globalIbGibTest.platform = TestBed.inject(Platform);

//     // globalIbGibTest.nav = TestBed.inject('IbgibNav' as any);
//     // globalIbGibTest.factories = TestBed.inject(WitnessFactoriesService);

//     // globalIbGibTest.cache = TestBed.inject(InMemoryIbgibCacheService);
//     // globalIbGibTest.getLatestCache = TestBed.inject(IonicStorageLatestIbgibCacheService);

//     // globalIbGibTest.ibgibs = TestBed.inject(IbgibsService);
//     // globalIbGibTest.common = TestBed.inject(CommonService);

//     // expect(true).toBeTruthy();
//     // globalIbGibTest.fixture = TestBed.createComponent(TagViewComponent);
//     // globalIbGibTest.component = globalIbGibTest.fixture.componentInstance;
//     // globalIbGibTest.fixture.detectChanges();
// });
