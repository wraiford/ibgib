import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularDelegate, ModalController } from '@ionic/angular';
import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
import { getTestBedConfig_Component } from 'src/karma.global';

import { WelcomePage } from './welcome.page';

describe('WelcomePage', () => {
  let component: WelcomePage;
  let fixture: ComponentFixture<WelcomePage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({
        componentType: WelcomePage,
        imports: [RouterTestingModule,],
        providers: [
          { provide: 'IbgibNav', useValue: new IonicIbgibNavService(null), }, // not sure when this will make a difference
          ModalController,
          AngularDelegate,
        ]
      })
    ).compileComponents();

    fixture = TestBed.createComponent(WelcomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
