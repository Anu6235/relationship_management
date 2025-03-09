import { TestBed } from '@angular/core/testing';

import { DynamicFaviconService } from './dynamic-favicon.service';

describe('DynamicFaviconService', () => {
  let service: DynamicFaviconService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DynamicFaviconService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
