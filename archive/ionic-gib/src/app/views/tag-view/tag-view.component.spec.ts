import { TestBed } from '@angular/core/testing';

import { ROOT, ROOT_ADDR } from 'ts-gib/dist/V1';

import { TagViewComponent } from './tag-view.component';
import { getGlobalInjections, getTestBedConfig_Component } from 'src/karma.global';
import { ChangeDetectorRef } from '@angular/core';


describe('TagViewComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: TagViewComponent })
    ).compileComponents();
  });

  it('should create an instance', async () => {

    let { common } = getGlobalInjections();

    expect(true).toBeTruthy();
    let fixture = TestBed.createComponent(TagViewComponent);
    let component = fixture.componentInstance;
    expect(component).toBeTruthy();
    await component.updateIbGib(ROOT_ADDR);
    expect(component.addr).toEqual(ROOT_ADDR);
    let t = { ...ROOT };
    expect(component.ibGib).toEqual(t);
    expect(common.platform).toBeTruthy();
    expect(common.platform.is('desktop')).toBeTruthy();

    (<ChangeDetectorRef>(<any>component).ref).detectChanges();

    // expect(component.ibGib).toBeFalsy();
    // await nav.go({ toAddr: 'ib^gib' });

    // common = TestBed.inject(CommonService);
    // changeDetectorRef = TestBed.inject(ChangeDetectorRef);
    // expect(new TestList(common, changeDetectorRef)).toBeTruthy();
    // expect(true).toBeTruthy();
  });

});
