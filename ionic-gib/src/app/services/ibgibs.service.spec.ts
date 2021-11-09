import { TestBed } from '@angular/core/testing';

import { IbgibsService } from './ibgibs.service';
import { CommonService } from './common.service';
import { FilesService } from './files.service';
import { ChangeDetectorRef } from '@angular/core';

describe('IbgibsService', () => {
  let files: FilesService;
  let ibgibs: IbgibsService;
  let common: CommonService;
  let changeDetectorRef: ChangeDetectorRef;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      FilesService, IbgibsService, CommonService, ChangeDetectorRef
    ]});
    files = TestBed.inject(FilesService);
    ibgibs = TestBed.inject(IbgibsService);
    common = TestBed.inject(CommonService);
    changeDetectorRef = TestBed.inject(ChangeDetectorRef);
  });

  it('should be created', () => {
    expect(ibgibs).toBeTruthy();
  });
});
