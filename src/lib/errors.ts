export type DomainErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHENTICATED"
  | "SLOT_UNAVAILABLE"
  | "SLOT_IN_PAST"
  | "PAYMENT_FAILED"
  | "CANCELLATION_WINDOW_CLOSED"
  | "INVALID_STATE"
  | "VALIDATION";

export class DomainError extends Error {
  constructor(public code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
  }
}
