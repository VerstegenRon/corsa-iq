// Private storage buckets. Files live under "<garage_id>/", which the storage policies check.

export const RECEIPT_BUCKET = "receipts";
export const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export const LOGGER_BUCKET = "logger-files";
