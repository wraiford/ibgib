import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { IbGibPage } from './ibgib.page';

describe('IbGibPage', () => {
  let component: IbGibPage;
  let fixture: ComponentFixture<IbGibPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IbGibPage ],
      imports: [IonicModule.forRoot(), RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(IbGibPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
