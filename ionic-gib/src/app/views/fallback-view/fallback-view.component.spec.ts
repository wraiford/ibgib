import { async, ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { getTestBedConfig_Component } from 'src/karma.global';

import { FallbackViewComponent } from './fallback-view.component';

describe('FallbackViewComponent', () => {
  let component: FallbackViewComponent;
  let fixture: ComponentFixture<FallbackViewComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: FallbackViewComponent })
    ).compileComponents();

    fixture = TestBed.createComponent(FallbackViewComponent);
    component = fixture.componentInstance;
    component.delayMs = 10;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
