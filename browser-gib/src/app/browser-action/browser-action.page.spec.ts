import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrowserActionPage } from './browser-action.page';

describe('BrowserActionPage', () => {
  let component: BrowserActionPage;
  let fixture: ComponentFixture<BrowserActionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrowserActionPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BrowserActionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
