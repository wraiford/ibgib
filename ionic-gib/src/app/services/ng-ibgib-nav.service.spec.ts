import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpHandler } from '@angular/common/http';
import { ChangeDetectorRef, InjectionToken } from '@angular/core';
import { Router, UrlSerializer } from '@angular/router';
import { CommonService, IbgibNav } from 'src/app/services/common.service';
import { FilesService } from 'src/app/services/files.service';
import { IbgibsService } from 'src/app/services/ibgibs.service';
import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
import { NavController } from '@ionic/angular';

import { NgIbgibNavService } from './ng-ibgib-nav.service';

describe('NgIbgibNavService', () => {
  let service: NgIbgibNavService;

  let files: FilesService;
  let ibgibs: IbgibsService;
  let nav: IbgibNav;
  let navController: NavController;
  let common: CommonService;
  let changeDetectorRef: ChangeDetectorRef;
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [
      HttpHandler, Router, HttpClient,
      UrlSerializer,
      NavController,
      { provide: 'IbgibNav', useClass: IonicIbgibNavService, },
      // IonicIbgibNavService,
      // FilesService, IbgibsService, ChangeDetectorRef, 
    ] });
    navController = TestBed.inject(NavController);
    // nav = new IonicIbgibNavService(navController);
    // providers.push(
    //   { provide: 'IbgibNav', useClass: IonicIbgibNavService, },
    // );
    // TestBed.configureTestingModule({ providers })
    // files = TestBed.inject(FilesService);
    // ibgibs = TestBed.inject(IbgibsService);
    nav = TestBed.inject(new InjectionToken<IbgibNav>('IbgibNav'));
    // common = new CommonService(ibgibs, files, nav);
    // changeDetectorRef = TestBed.inject(ChangeDetectorRef);
  });

  it('should be created', async () => {
    expect(nav).toBeTruthy();
  });
});
