/** The 21 Patternlings (GDD §5.2). Pure data; art is added per district (C4-C7). */
export type PatternFamily = "creational" | "structural" | "behavioural";

export interface Patternling {
  id: string;
  name: string;
  /** The design pattern(s) this creature embodies. */
  pattern: string;
  family: PatternFamily;
  /** One-line "what problem it solves", original wording. */
  solves: string;
  /** The honest cost: why overusing it hurts (drives the YAGNI penalty). */
  cost: string;
}

const P = (id: string, name: string, pattern: string, family: PatternFamily, solves: string, cost: string): Patternling => ({ id, name, pattern, family, solves, cost });

export const PATTERNLINGS: readonly Patternling[] = [
  P("forgebot", "Forgebot", "Factory Method / Abstract Factory", "creational", "Callers must not name concrete types they create.", "An extra layer of indirection for a type that never varies."),
  P("beaverbuild", "Beaverbuild", "Builder", "creational", "Objects with many optional parts need step-by-step construction.", "Boilerplate when a plain constructor with three arguments would do."),
  P("solo", "Solo", "Singleton", "creational", "Exactly one instance must exist (rare: a hardware handle, a process-wide registry).", "Hidden global state: untestable, order-dependent, a concurrency hazard."),
  P("clonewisp", "Clonewisp", "Prototype", "creational", "Copying a configured object is cheaper than rebuilding it.", "Deep-copy bugs and slicing when cloning through base pointers."),
  P("axolink", "Axolink", "Adapter", "structural", "An existing class has the wrong interface for its new caller.", "A wrapper layer that can hide a bad design instead of fixing it."),
  P("bridgeback", "Bridgeback", "Bridge", "structural", "Two dimensions of variation would explode into a subclass grid.", "Up-front abstraction when only one dimension ever varies."),
  P("fractree", "Fractree", "Composite", "structural", "Treat a single item and a group of items uniformly (trees).", "Overly general interface: leaves must stub methods only containers need."),
  P("shellcrab", "Shellcrab", "Decorator", "structural", "Stack optional behaviours at run time without a subclass per combination.", "Many tiny wrappers: identity checks and debugging get harder."),
  P("facadeon", "Facadeon", "Facade", "structural", "A messy subsystem needs one simple entry point.", "Can become a god class that every caller leans on."),
  P("flytile", "Flytile", "Flyweight", "structural", "Millions of similar objects share intrinsic state to save memory.", "Complexity and shared-state bugs; pointless unless memory is measured."),
  P("proxifox", "Proxifox", "Proxy", "structural", "Control access to an object: lazy load, cache, remote, permission.", "Hidden latency and surprising behaviour behind an identical interface."),
  P("chamelstrat", "Chamelstrat", "Strategy", "behavioural", "Swap an algorithm at run time behind one interface.", "A class per tiny variation; a lambda or function pointer is often enough."),
  P("owlserver", "Owlserver", "Observer", "behavioural", "Many listeners react to one subject's changes without coupling.", "Update storms, lifetime bugs (dangling observers), unclear ordering."),
  P("commandant", "Commandant", "Command", "behavioural", "Requests as objects: queue, log, undo, retry.", "Class per action; overkill when no undo or queueing is needed."),
  P("shapeshift", "Shapeshift", "State", "behavioural", "Behaviour depends on a mode that changes at run time (replaces big switch).", "More classes than a plain enum when there are two states."),
  P("templar", "Templar", "Template Method", "behavioural", "Fixed algorithm skeleton, subclasses fill the steps.", "Inheritance coupling: the base class's call order becomes a hidden contract."),
  P("inchworm", "Inchworm", "Iterator", "behavioural", "Traverse a collection without exposing its structure.", "In C++ the standard iterators already do this: do not rebuild them."),
  P("antchain", "Antchain", "Chain of Responsibility", "behavioural", "Pass a request along handlers until one takes it.", "Requests can fall off the end silently; order is a hidden contract."),
  P("mediowl", "Mediowl", "Mediator", "behavioural", "Many peers talk through one hub instead of to each other.", "The mediator itself becomes the god object."),
  P("mementortoise", "Mementortoise", "Memento", "behavioural", "Snapshot and restore state without breaking encapsulation.", "Snapshots cost memory; large states need diffs."),
  P("visitorb", "Visitorb", "Visitor", "behavioural", "Add operations to a stable class hierarchy without editing it.", "Adding a new element type forces edits in every visitor (the reverse of OCP)."),
];

const BY_ID = new Map(PATTERNLINGS.map((p) => [p.id, p]));
export const patternlingById = (id: string): Patternling | undefined => BY_ID.get(id);
