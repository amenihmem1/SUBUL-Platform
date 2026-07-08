/**
 * Coordonnées bancaires pour les virements manuels (checkout / paiement bancaire).
 * Source unique côté frontend pour l’UI.
 *
 * @see backend/api/src/common/bank-payment-info.ts — même objet côté API ; garder les deux synchronisés.
 */
export const BANK_PAYMENT_INFO = {
  titulaireDuCompte: 'STE DEV4CAUSTAZA',
  domiciliation: 'Sned',
  banque: '03',
  agence: '126',
  numeroCompte: '116 0115 004254',
  cleRib: '39',
  /** Espacement officiel */
  ribComplet: '03 126 116 0115 004254 39',
  /** Espacement officiel */
  iban: 'TN59 03 126 116 0115 004254 39',
} as const;

export type BankPaymentInfo = typeof BANK_PAYMENT_INFO;
