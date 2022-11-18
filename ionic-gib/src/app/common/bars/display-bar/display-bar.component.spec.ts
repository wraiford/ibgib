import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { getTestBedConfig_Component } from 'src/karma.global';

import { RobbotBarComponent } from '../robbot-bar/robbot-bar.component';

describe('RobbotBarComponent', () => {
  let component: RobbotBarComponent;
  let fixture: ComponentFixture<RobbotBarComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: RobbotBarComponent })
    ).compileComponents();

    fixture = TestBed.createComponent(RobbotBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
