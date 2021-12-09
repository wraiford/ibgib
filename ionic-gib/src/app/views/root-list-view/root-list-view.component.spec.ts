import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RootListViewComponent } from './root-list-view.component';

describe('RootListViewComponent', () => {
  let component: RootListViewComponent;
  let fixture: ComponentFixture<RootListViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RootListViewComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RootListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
