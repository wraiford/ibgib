import { TestBed } from '@angular/core/testing';

import { IbgibsService } from './ibgibs.service';
import { CommonService } from './common.service';
// import { FilesService } from './files.service';
import { ChangeDetectorRef } from '@angular/core';
import { getGlobalInjections, getTestBedConfig } from 'src/karma.global';

describe('IbgibsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule(
      getTestBedConfig()
    );
  });

  it('should be created', () => {
    let { ibgibs } = getGlobalInjections();

    expect(ibgibs).toBeTruthy();
  });
});
