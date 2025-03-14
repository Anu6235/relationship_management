import { TestBed } from '@angular/core/testing';

import { LedgerPdfService } from './ledger-pdf.service';

describe('LedgerPdfService', () => {
  let service: LedgerPdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LedgerPdfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
