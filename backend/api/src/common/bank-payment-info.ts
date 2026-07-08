/**
 * Coordonnées bancaires pour les virements manuels (instructions virement / emails futurs).
 * Source unique côté API — alignée sur le frontend.
 *
 * @see frontend/lib/payments/bank-payment-info.ts — maintenir les deux fichiers identiques.
 */
export const BANK_PAYMENT_INFO = {
  titulaireDuCompte: 'STE DEV4CAUSTAZA',
  domiciliation: 'Sned',
  banque: '03',
  agence: '126',
  numeroCompte: '116 0115 004254',
  cleRib: '39',
  ribComplet: '03 126 116 0115 004254 39',
  iban: 'TN59 03 126 116 0115 004254 39',
} as const;

export type BankPaymentInfo = typeof BANK_PAYMENT_INFO;
