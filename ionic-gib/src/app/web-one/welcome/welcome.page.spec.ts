import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { COMMON_TEST_PROVIDERS, getTestBedConfig, getTestBedConfig_Component } from 'src/karma.global';

import { WelcomePage } from './welcome.page';

describe('WelcomePage', () => {
  let component: WelcomePage;
  let fixture: ComponentFixture<WelcomePage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig({
        declarations: [WelcomePage],
        providers: [
          ...COMMON_TEST_PROVIDERS,
          ActivatedRoute,
        ],
        imports: [
          IonicModule.forRoot(),
          RouterTestingModule.withRoutes([{ path: 'welcome', component: WelcomePage }])
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
