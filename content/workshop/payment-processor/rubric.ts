import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations, validates a request in the documented order and sequences the collaborators", phase: "base", owners: ["ProcessorImpl", "PaymentProcessor", "PaymentService", "PaymentFacade", "Processor"] },
  { id: "res-keys", text: "Remembers the final answer to each request by its key and says whether a new call is fresh, a replay or a conflict", phase: "base", owners: ["KeyBook", "IdempotencyStore", "IdempotencyKeys", "KeyStore", "RequestLog"] },
  { id: "res-retry", text: "Repeats a gateway call on a temporary error up to the limit and stops on any real answer, knowing nothing about payments", phase: "base", owners: ["Retrier", "RetryPolicy", "RetryRunner", "Retry", "AttemptLoop"] },
  { id: "res-ledger", text: "Records approved payments, issues ids and totals what has been refunded of each", phase: "base", owners: ["PaymentLedger", "PaymentStore", "Payments", "Ledger", "PaymentRepository"] },
  { id: "res-fingerprint", text: "Says what makes two requests 'the same', as a value that is compared, not as code scattered in the service", phase: "storm1", owners: ["RequestShape", "RequestFingerprint", "Fingerprint", "RequestKey", "RequestSignature"] },
  { id: "res-lifetime", text: "Decides when a remembered answer stops counting, behind an interface so keys can live forever or for a fixed time", phase: "storm2", owners: ["Lifetime", "ExpiryPolicy", "KeyLifetime", "Ttl", "RetentionPolicy"] },
];
