import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { getTestBedConfig_Component } from 'src/karma.global';

import { YourDataPage } from './your-data.page';

describe('YourDataPage', () => {
  let component: YourDataPage;
  let fixture: ComponentFixture<YourDataPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: YourDataPage })
    ).compileComponents();

    fixture = TestBed.createComponent(YourDataPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
