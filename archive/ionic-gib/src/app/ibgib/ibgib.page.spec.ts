import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, } from '@angular/router';
import { IbGibPage } from './ibgib.page';
import { ANGULAR_TEST_PROVIDERS, COMMON_TEST_PROVIDERS, DEFAULT_TEST_IMPORTS, getTestBedConfig, getTestBedConfig_Component, IBGIB_TEST_PROVIDERS, IONIC_TEST_PROVIDERS } from 'src/karma.global';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularDelegate, IonRouterOutlet, ModalController } from '@ionic/angular';

describe('IbGibPage', () => {
  let component: IbGibPage;
  let fixture: ComponentFixture<IbGibPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig({
        declarations: [IbGibPage],
        imports: [
          ...DEFAULT_TEST_IMPORTS,
          RouterTestingModule,
        ],
        providers: [
          ...IBGIB_TEST_PROVIDERS,
          ...ANGULAR_TEST_PROVIDERS,
          AngularDelegate,
        ]
      })
    ).compileComponents();

    fixture = TestBed.createComponent(IbGibPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
