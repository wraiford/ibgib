import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { getTestBedConfig_Component } from 'src/karma.global';

import { BootstrapPage } from './bootstrap.page';

describe('BootstrapPage', () => {
  let component: BootstrapPage;
  let fixture: ComponentFixture<BootstrapPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: BootstrapPage })
    ).compileComponents();

    fixture = TestBed.createComponent(BootstrapPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
