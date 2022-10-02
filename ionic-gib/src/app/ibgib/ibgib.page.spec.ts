import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IbGibPage } from './ibgib.page';
import { COMMON_TEST_PROVIDERS, getTestBedConfig, getTestBedConfig_Component } from 'src/karma.global';

describe('IbGibPage', () => {
  let component: IbGibPage;
  let fixture: ComponentFixture<IbGibPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule(
      getTestBedConfig({
        declarations: [IbGibPage],
        providers: [
          ...COMMON_TEST_PROVIDERS,
          ActivatedRoute,
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
