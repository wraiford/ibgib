// import { HttpClient, HttpHandler } from '@angular/common/http';
// import { ChangeDetectorRef } from '@angular/core';
// import { TestBed } from '@angular/core/testing';
// import { Router, UrlSerializer } from '@angular/router';
// import { CommonService, IbgibNav } from 'src/app/services/common.service';
// import { IbgibsService } from 'src/app/services/ibgibs.service';
// import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
// import { IbGibItem } from '../types/ux'; // refactoring to not use types/index
// import { IbgibListComponentBase } from './ibgib-list-component-base';
// import { AlertController, LoadingController, MenuController, ModalController, NavController, Platform } from '@ionic/angular';
// import { WitnessFactoriesService } from 'src/app/services/witness-factories.service';
// import { InMemoryIbgibCacheService } from 'src/app/services/in-memory-ibgib-cache.service';
// import { IbgibScrollingListComponentBase } from './ibgib-scrolling-list-component-base';
// import { IonicStorageLatestIbgibCacheService } from 'src/app/services/ionic-storage-latest-ibgib-cache.service';


// class TestList extends IbgibScrollingListComponentBase<IbGibItem> {
//   /**
//    *
//    */
//   constructor(
//     protected common: CommonService,
//     protected ref: ChangeDetectorRef,
//   ) {
//     super(common, ref);
//   }
// }

// describe('IbgibScrollingListComponentBase', () => {
//   let ibgibs: IbgibsService;
//   let nav: IbgibNav;
//   let common: CommonService;
//   let changeDetectorRef: ChangeDetectorRef;
//   let modalController: ModalController;
//   let platform: Platform;
//   let factories: WitnessFactoriesService;
//   let alertController: AlertController;
//   let cache: InMemoryIbgibCacheService;
//   let getLatestCache: IonicStorageLatestIbgibCacheService;
//   let menuCtrl: MenuController;
//   let loadingCtrl: LoadingController;
//   beforeEach(() => {
//     TestBed.configureTestingModule({
//       providers: [
//         HttpHandler, Router, HttpClient,
//         UrlSerializer,
//         NavController,
//         { provide: 'IbgibNav', useClass: IonicIbgibNavService, },
//         IbgibsService,
//         ChangeDetectorRef,
//         ModalController,
//         Platform,
//         WitnessFactoriesService,
//         AlertController,
//         InMemoryIbgibCacheService,
//         { provide: 'IbGibCacheService', useClass: IonicStorageLatestIbgibCacheService },
//         MenuController,
//         LoadingController,
//       ]
//     });

//     ibgibs = TestBed.inject(IbgibsService);
//     modalController = TestBed.inject(ModalController);
//     nav = TestBed.inject(IonicIbgibNavService);
//     platform = TestBed.inject(Platform);
//     factories = TestBed.inject(WitnessFactoriesService);
//     alertController = TestBed.inject(AlertController);
//     cache = TestBed.inject(InMemoryIbgibCacheService);
//     getLatestCache = TestBed.inject(IonicStorageLatestIbgibCacheService);
//     menuCtrl = TestBed.inject(MenuController);
//     loadingCtrl = TestBed.inject(LoadingController);

//     common = new CommonService(
//       ibgibs, modalController, nav, platform, factories, alertController, cache,
//       getLatestCache, menuCtrl, loadingCtrl
//     );
//     changeDetectorRef = TestBed.inject(ChangeDetectorRef);
//   });


//   it('should create an instance', () => {
//     common = TestBed.inject(CommonService);
//     changeDetectorRef = TestBed.inject(ChangeDetectorRef);
//     expect(new TestList(common, changeDetectorRef)).toBeTruthy();
//     // expect(true).toBeTruthy();
//   });

// });
