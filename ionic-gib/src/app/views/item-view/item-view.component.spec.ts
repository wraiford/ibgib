import { ComponentFixture, TestBed } from '@angular/core/testing';

import { getGlobalInjections, getTestBedConfig_Component } from 'src/karma.global';
import { ItemViewComponent } from './item-view.component';

describe('ListItemViewComponent', () => {
  let component: ItemViewComponent;
  let fixture: ComponentFixture<ItemViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({
        componentType: ItemViewComponent
      })).compileComponents();

    fixture = TestBed.createComponent(ItemViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
