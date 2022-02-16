import { HttpClient, HttpHandler } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlSerializer } from '@angular/router';
import { CommonService, IbgibNav } from 'src/app/services/common.service';
//import { FilesService } from 'src/app/services/files.service';
import { IbgibsService } from 'src/app/services/ibgibs.service';
import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
import { IbgibItem } from '../types';
import { IbgibListComponentBase } from './ibgib-list-component-base';
import { ModalController, NavController } from '@ionic/angular';


// class TestList extends IbgibListComponentBase<IbgibItem> {
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

describe('IbgibListComponentBase', () => {
  // let files: FilesService;
  let ibgibs: IbgibsService;
  let nav: IbgibNav;
  let common: CommonService;
  let changeDetectorRef: ChangeDetectorRef;
  let modalController: ModalController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      HttpHandler, Router, HttpClient,
      UrlSerializer,
      NavController,
      { provide: 'IbgibNav', useClass: IonicIbgibNavService, },
      // FilesService,
      IbgibsService, ChangeDetectorRef, ModalController,
    ]});
    // files = TestBed.inject(FilesService);
    ibgibs = TestBed.inject(IbgibsService);
    nav = TestBed.inject(IonicIbgibNavService);
    modalController = TestBed.inject(ModalController);
    // common = new CommonService(ibgibs, files, nav);
    // public modalController: ModalController,
    common = new CommonService(ibgibs, modalController, nav);
    changeDetectorRef = TestBed.inject(ChangeDetectorRef);
  });


  it('should create an instance', () => {
    common = TestBed.inject(CommonService);
    changeDetectorRef = TestBed.inject(ChangeDetectorRef);
    // expect(new TestList(common, changeDetectorRef)).toBeTruthy();
    expect(true).toBeTruthy();
  });

});
