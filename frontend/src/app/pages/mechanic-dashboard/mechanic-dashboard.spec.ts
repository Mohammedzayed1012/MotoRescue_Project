import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MechanicDashboard } from './mechanic-dashboard';

describe('MechanicDashboard', () => {
  let component: MechanicDashboard;
  let fixture: ComponentFixture<MechanicDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MechanicDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(MechanicDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
