import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { getTestBedConfig_Component } from 'src/karma.global';

import { IbgibFullscreenModalComponent } from './ibgib-fullscreen-modal.component';

describe('IbgibFullscreenModalComponent', () => {
  let component: IbgibFullscreenModalComponent;
  let fixture: ComponentFixture<IbgibFullscreenModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: IbgibFullscreenModalComponent })
    ).compileComponents();

    fixture = TestBed.createComponent(IbgibFullscreenModalComponent);
    component = fixture.componentInstance;
    component.addr = 'ib^gib';
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
