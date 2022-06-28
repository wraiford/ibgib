import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { LinkViewComponent } from './link-view.component';

describe('LinkViewComponent', () => {
  let component: LinkViewComponent;
  let fixture: ComponentFixture<LinkViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LinkViewComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(LinkViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
