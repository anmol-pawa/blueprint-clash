// Static list of exercise metadata for the app build (a bundler cannot follow the Node loader's path imports).
// Add an entry when an exercise is used by an in-game screen.
import type { ExerciseMeta } from "@/lib/exercises/types";
import { meta as fileHandle } from "./file-handle/meta";
import { meta as srpInvoice } from "./srp-invoice/meta";
import { meta as ocpShipping } from "./ocp-shipping/meta";
import { meta as lspAccount } from "./lsp-account/meta";
import { meta as ispMachine } from "./isp-machine/meta";
import { meta as dipNotifier } from "./dip-notifier/meta";
import { meta as dipClock } from "./dip-clock/meta";
import { meta as demeterWallet } from "./demeter-wallet/meta";
import { meta as compositionHistory } from "./composition-history/meta";
import { meta as factoryRegistry } from "./factory-registry/meta";
import { meta as builderRequest } from "./builder-request/meta";
import { meta as abstractFactoryFamily } from "./abstract-factory-family/meta";
import { meta as prototypeClone } from "./prototype-clone/meta";
import { meta as singletonMeyers } from "./singleton-meyers/meta";
import { meta as poolLease } from "./pool-lease/meta";
import { meta as adapterPayments } from "./adapter-payments/meta";
import { meta as bridgeRenderer } from "./bridge-renderer/meta";
import { meta as compositeFs } from "./composite-fs/meta";
import { meta as decoratorStream } from "./decorator-stream/meta";
import { meta as facadeCheckout } from "./facade-checkout/meta";

export const EXERCISE_META: Record<string, ExerciseMeta> = {
  "file-handle": fileHandle,
  "srp-invoice": srpInvoice,
  "ocp-shipping": ocpShipping,
  "lsp-account": lspAccount,
  "isp-machine": ispMachine,
  "dip-notifier": dipNotifier,
  "dip-clock": dipClock,
  "demeter-wallet": demeterWallet,
  "composition-history": compositionHistory,
  "factory-registry": factoryRegistry,
  "builder-request": builderRequest,
  "abstract-factory-family": abstractFactoryFamily,
  "prototype-clone": prototypeClone,
  "singleton-meyers": singletonMeyers,
  "pool-lease": poolLease,
  "adapter-payments": adapterPayments,
  "bridge-renderer": bridgeRenderer,
  "composite-fs": compositeFs,
  "decorator-stream": decoratorStream,
  "facade-checkout": facadeCheckout,
};
