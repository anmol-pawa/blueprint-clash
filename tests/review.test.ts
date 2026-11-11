import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { reviewFiles } from "@/lib/review";
import { parseFile } from "@/lib/review/parse";
import { tokenize } from "@/lib/review/tokenize";

const rules = (src: string, path = "a.cpp") => reviewFiles([{ path, content: src }]).findings.map((f) => f.rule);
const has = (src: string, rule: string) => rules(src).includes(rule);

describe("tokenizer", () => {
  it("skips comments, strings, raw strings and preprocessor lines, and tracks lines", () => {
    const t = tokenize('#include <x>\n// new\nint a = 1; /* new\n new */ const char* s = "new class {"; auto r = R"x(new)x";\nint b;');
    expect(t.map((x) => x.t)).not.toContain("new");
    expect(t.find((x) => x.t === "b")?.line).toBe(5);
  });
});

describe("virtual-destructor", () => {
  it("flags a polymorphic base without a virtual destructor", () => {
    expect(has("class Shape { public: virtual double area() const = 0; };", "virtual-destructor")).toBe(true);
  });
  it("accepts a virtual destructor, = default included", () => {
    expect(has("class Shape { public: virtual ~Shape() = default; virtual double area() const = 0; };", "virtual-destructor")).toBe(false);
  });
  it("accepts a protected non-virtual destructor (Core Guidelines C.35)", () => {
    expect(has("class Shape { public: virtual int f() = 0; protected: ~Shape() = default; };", "virtual-destructor")).toBe(false);
  });
  it("accepts a derived class when a known base has the virtual destructor", () => {
    const src = "class A { public: virtual ~A() = default; virtual void f() = 0; }; class B : public A { public: void f() override; virtual void g(); };";
    expect(has(src, "virtual-destructor")).toBe(false);
  });
  it("flags the base when only the derived class declares one", () => {
    const src = "class A { public: virtual void f() = 0; }; class B : public A { public: ~B() override; void f() override; };";
    expect(rules(src).filter((r) => r === "virtual-destructor")).toHaveLength(1);
  });
  it("ignores classes with no virtual functions and final leaf classes", () => {
    expect(has("class P { public: int f() const; ~P(); };", "virtual-destructor")).toBe(false);
    expect(has("class Leaf final { public: virtual void f(); };", "virtual-destructor")).toBe(false);
  });
});

describe("raw-new", () => {
  it("flags new with no owner", () => {
    expect(has("void f() { Widget* w = new Widget(); use(w); }", "raw-new")).toBe(true);
    expect(has("class C { void add() { items_.push_back(new Item); } };", "raw-new")).toBe(true);
  });
  it("accepts owned allocation", () => {
    expect(has("void f() { std::unique_ptr<W> p(new W()); p.reset(new W); auto q = std::shared_ptr<W>(new W); }", "raw-new")).toBe(false);
    expect(has("void f() { auto p = std::make_unique<W>(); }", "raw-new")).toBe(false);
  });
  it("ignores new in comments, strings and operator new", () => {
    expect(has('// new Foo\nconst char* s = "new Foo"; void* operator new(unsigned long n);', "raw-new")).toBe(false);
  });
});

describe("public-mutable-field", () => {
  it("flags public mutable data on a type with behaviour", () => {
    expect(has("class Account { public: int balance; void deposit(int n); };", "public-mutable-field")).toBe(true);
    expect(has("struct Account { std::string owner, id; void close(); };", "public-mutable-field")).toBe(true);
  });
  it("accepts private fields, const/static/constexpr fields and plain data carriers", () => {
    expect(has("class A { int x_; public: void f(); };", "public-mutable-field")).toBe(false);
    expect(has("class A { public: const int id; static int count; static constexpr int kMax = 3; const std::string& ref; void f(); };", "public-mutable-field")).toBe(false);
    expect(has("struct Point { double x; double y; };", "public-mutable-field")).toBe(false);
  });
  it("treats a pointer-to-const as mutable, a const pointer as immutable", () => {
    expect(has("class A { public: const char* p; void f(); };", "public-mutable-field")).toBe(true);
    expect(has("class A { public: char* const p; void f(); };", "public-mutable-field")).toBe(false);
  });
  it("handles default member initialisers and arrays", () => {
    expect(has("class A { public: int n{0}; int a[3]; std::vector<int> v = {1, 2}; void f(); };", "public-mutable-field")).toBe(true);
    expect(rules("class A { public: int n{0}; int a[3]; std::vector<int> v = {1, 2}; void f(); };")).toHaveLength(3);
  });
});

describe("missing-override", () => {
  const base = "class A { public: virtual ~A() = default; virtual int f(int) const; virtual void g(); };";
  it("flags a matching function without override, virtual or not", () => {
    expect(has(base + "class B : public A { public: int f(int) const; };", "missing-override")).toBe(true);
    expect(has(base + "class B : public A { public: virtual void g(); };", "missing-override")).toBe(true);
  });
  it("accepts override/final and non-matching signatures", () => {
    expect(has(base + "class B : public A { public: int f(int) const override; void g() final; };", "missing-override")).toBe(false);
    expect(has(base + "class B : public A { public: int f(int); int f(int, int) const; void h(); };", "missing-override")).toBe(false);
  });
  it("sees through a grandparent and ignores unknown bases", () => {
    expect(has(base + "class B : public A {}; class C : public B { public: void g(); };", "missing-override")).toBe(true);
    expect(has("class C : public std::exception { public: const char* what() const noexcept; };", "missing-override")).toBe(false);
  });
});

describe("god-class", () => {
  const methods = (n: number) => Array.from({ length: n }, (_, i) => `void m${i}();`).join(" ");
  it("flags more than 12 methods and accepts exactly 12", () => {
    expect(has(`class G { public: ${methods(13)} };`, "god-class")).toBe(true);
    expect(has(`class G { public: ${methods(12)} };`, "god-class")).toBe(false);
  });
  it("does not count constructors, the destructor or defaulted/deleted specials", () => {
    expect(has(`class G { public: G(); G(const G&) = delete; ~G(); ${methods(12)} };`, "god-class")).toBe(false);
  });
  it("counts lines including out-of-class definitions", () => {
    const body = "  int x = 0;\n".repeat(310);
    const src = `class G { public: void run(); };\nvoid G::run() {\n${body}}\n`;
    const f = reviewFiles([{ path: "g.cpp", content: src }]).findings.find((x) => x.rule === "god-class");
    expect(f?.severity).toBe("major");
  });
});

describe("object-slicing", () => {
  const base = "class Shape { public: virtual ~Shape() = default; virtual double area() const = 0; };";
  it("flags a polymorphic parameter taken by value, in-class and out-of-class", () => {
    expect(has(base + "class Canvas { public: void draw(Shape s); };", "object-slicing")).toBe(true);
    expect(has(base + "void render(const int n, Shape s) { }", "object-slicing")).toBe(true);
  });
  it("accepts references, pointers, smart pointers and non-polymorphic values", () => {
    expect(has(base + "void a(const Shape& s); void b(Shape* s); void c(std::unique_ptr<Shape> s); void d(std::vector<Shape*> v);", "object-slicing")).toBe(false);
    expect(has("struct Point { int x; int y; }; void move(Point p, std::string label);", "object-slicing")).toBe(false);
  });
  it("sees polymorphism inherited from a known base", () => {
    expect(has(base + "class Circle : public Shape { public: double area() const override; }; void f(Circle c) {}", "object-slicing")).toBe(true);
  });
});

describe("deep-inheritance", () => {
  const chain = (n: number) => Array.from({ length: n }, (_, i) => `class C${i}${i ? ` : public C${i - 1}` : ""} { public: virtual ~C${i}() = default; };`).join("\n");
  it("flags a chain more than 3 levels deep", () => {
    const out = reviewFiles([{ path: "a.h", content: chain(5) }]).findings.filter((f) => f.rule === "deep-inheritance");
    expect(out.map((f) => f.subject)).toEqual(["C4"]);
  });
  it("accepts exactly 3 levels below the root", () => {
    expect(has(chain(4), "deep-inheritance")).toBe(false);
  });
  it("survives an inheritance cycle", () => {
    expect(() => rules("class A : public B {}; class B : public A {};")).not.toThrow();
  });
});

describe("long-function", () => {
  const body = (n: number) => Array.from({ length: n }, (_, i) => `  total += ${i};`).join("\n");
  it("flags an out-of-class function over 40 lines and an in-class method", () => {
    expect(has(`int run() {\n int total = 0;\n${body(45)}\n return total;\n}`, "long-function")).toBe(true);
    expect(has(`class A { public:\n int run() {\n int total = 0;\n${body(45)}\n return total;\n }\n};`, "long-function")).toBe(true);
  });
  it("accepts a function at the limit", () => {
    expect(has(`int run() {\n int total = 0;\n${body(36)}\n return total;\n}`, "long-function")).toBe(false);
  });
});

describe("type-tag-switch", () => {
  it("flags a switch on a type tag with several arms", () => {
    const src = "double area(const Shape& s) { switch (s.type) { case CIRCLE: return 1; case SQUARE: return 2; case TRIANGLE: return 3; } return 0; }";
    expect(has(src, "type-tag-switch")).toBe(true);
    expect(has("class P { double f() { switch (kind()) { case 0: return 1; case 1: return 2; case 2: return 3; } return 0; } };", "type-tag-switch")).toBe(true);
  });
  it("accepts small switches and switches on non-tag values", () => {
    expect(has("int f(int day) { switch (day) { case 1: return 1; case 2: return 2; case 3: return 3; } return 0; }", "type-tag-switch")).toBe(false);
    expect(has("int f(Shape s) { switch (s.type) { case A: return 1; case B: return 2; } return 0; }", "type-tag-switch")).toBe(false);
  });
});

describe("dynamic-cast-chain", () => {
  it("flags two or more dynamic_casts in one function", () => {
    const src = "double area(Shape* s) { if (auto* c = dynamic_cast<Circle*>(s)) return 1; if (auto* q = dynamic_cast<Square*>(s)) return 2; return 0; }";
    expect(has(src, "dynamic-cast-chain")).toBe(true);
  });
  it("accepts a single probing cast", () => {
    expect(has("bool isCircle(Shape* s) { return dynamic_cast<Circle*>(s) != nullptr; }", "dynamic-cast-chain")).toBe(false);
  });
});

describe("parser robustness", () => {
  it("handles templates, nested classes, namespaces, init lists, lambdas and std::function members", () => {
    const src = `
namespace shop {
template <typename T> class Box { public: explicit Box(T v) : v_(std::move(v)), n_{0} {} const T& get() const { return v_; } private: T v_; int n_{0}; std::function<void()> cb_; };
class Outer { public: class Inner { public: virtual ~Inner() = default; }; void run() { auto f = [](int a) { return a; }; (void)f; } private: Inner* in_ = nullptr; };
}`;
    const m = parseFile("t.h", src);
    const box = m.classes.find((c) => c.name === "Box");
    expect(box?.methods.map((x) => x.name)).toEqual(["Box", "get"]);
    expect(box?.fields.map((x) => x.name)).toEqual(["v_", "n_", "cb_"]);
    expect(m.classes.map((c) => c.name).sort()).toEqual(["Box", "Inner", "Outer"]);
    expect(m.classes.find((c) => c.name === "Outer")?.methods.map((x) => x.name)).toEqual(["run"]);
    expect(reviewFiles([{ path: "t.h", content: src }]).findings).toEqual([]);
  });
  it("sorts findings blocker, major, minor and counts them", () => {
    const r = reviewFiles([{ path: "x.cpp", content: "class A { public: virtual void f(); }; class B : public A { public: void f(); }; void g() { new int; }" }]);
    expect(r.findings.map((f) => f.severity)).toEqual(["blocker", "blocker", "minor"]);
    expect(r.counts).toEqual({ blocker: 2, major: 0, minor: 1 });
    expect(r.clean).toBe(false);
    for (const f of r.findings) expect(f.lesson && f.fix && f.message).toBeTruthy();
  });
  it("ignores non-C++ files such as notes", () => {
    expect(reviewFiles([{ path: "notes.md", content: "class A { virtual void f(); };" }]).findings).toEqual([]);
  });
});

// Cross-check: the token parser must agree with clang's own AST on header-free fixtures (ADR 0002).
function clangHas(): boolean {
  try {
    execFileSync("clang++", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

interface AstNode {
  kind?: string;
  name?: string;
  isImplicit?: boolean;
  completeDefinition?: boolean;
  tagUsed?: string;
  virtual?: boolean;
  pure?: boolean;
  type?: { qualType?: string };
  bases?: { type: { qualType: string } }[];
  inner?: AstNode[];
}

const FIXTURE = `
class Base { public: virtual ~Base() = default; virtual int area(int k) const = 0; void util(); protected: int shared_; };
class Derived : public Base { public: Derived(); int area(int k) const override; virtual void extra(); static int count(); private: int w_; double h_; public: int open_; };
struct Plain { double x; double y; };
struct Mixed : Base { int a, b; void run() const; };
`;

describe.skipIf(!clangHas())("clang AST cross-check", () => {
  it("agrees on classes, bases, methods, virtual/override/const flags and field access", () => {
    const dir = mkdtempSync(join(tmpdir(), "bp-ast-"));
    try {
      writeFileSync(join(dir, "f.cpp"), FIXTURE);
      const json = execFileSync("clang++", ["-std=c++20", "-fsyntax-only", "-Xclang", "-ast-dump=json", join(dir, "f.cpp")], { maxBuffer: 64 << 20 }).toString();
      const tu = JSON.parse(json) as AstNode;
      const want = (tu.inner ?? [])
        .filter((n) => n.kind === "CXXRecordDecl" && n.completeDefinition && !n.isImplicit)
        .map((n) => {
          let access = n.tagUsed === "struct" ? "public" : "private";
          const methods: string[] = [];
          const fields: string[] = [];
          for (const c of n.inner ?? []) {
            if (c.kind === "AccessSpecDecl") access = (c as unknown as { access: string }).access;
            else if (c.kind === "FieldDecl") fields.push(`${access}:${c.name}`);
            else if (c.kind === "CXXMethodDecl" || c.kind === "CXXDestructorDecl" || c.kind === "CXXConstructorDecl") {
              if (c.isImplicit) continue;
              const q = c.type?.qualType ?? "";
              const over = (c.inner ?? []).some((x) => x.kind === "OverrideAttr");
              const nm = c.kind === "CXXDestructorDecl" ? "~" + n.name : c.name;
              methods.push(`${nm}${c.virtual || over ? " virtual" : ""}${over ? " override" : ""}${/\) const$/.test(q) ? " const" : ""}`);
            }
          }
          return { name: n.name, bases: (n.bases ?? []).map((b) => b.type.qualType), methods, fields };
        });
      const got = parseFile("f.cpp", FIXTURE).classes.map((c) => ({
        name: c.name,
        bases: c.bases,
        methods: c.methods.map((x) => `${x.name}${x.isVirtual ? " virtual" : ""}${x.isOverride ? " override" : ""}${x.isConst ? " const" : ""}`),
        fields: c.fields.map((x) => `${x.access}:${x.name}`),
      }));
      expect(got).toEqual(want);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("virtual-destructor with unreviewed bases", () => {
  it("does not blame a class that only overrides functions of a base in a file we were not given", () => {
    expect(has("class Impl : public lib::Api { public: int f() const override; };", "virtual-destructor")).toBe(false);
  });
});

describe("review score wiring", () => {
  it("costs blockers most and never goes below zero", async () => {
    const { reviewScore, isProvidedHeader } = await import("../lib/review/score");
    expect(reviewScore({ blocker: 0, major: 0, minor: 0 })).toBe(1);
    expect(reviewScore({ blocker: 1, major: 0, minor: 0 })).toBeCloseTo(0.66);
    expect(reviewScore({ blocker: 0, major: 0, minor: 2 })).toBeCloseTo(0.9);
    expect(reviewScore({ blocker: 9, major: 9, minor: 9 })).toBe(0);
    expect(isProvidedHeader("api.h")).toBe(true);
    expect(isProvidedHeader("api_storm1.h")).toBe(true);
    expect(isProvidedHeader("library.h")).toBe(false);
  });
});

describe("non-const-getter (minor)", () => {
  it("flags a getter-named, value-returning member that is not const", () => {
    expect(has("class A { public: int getCount() { return n_; } private: int n_ = 0; };", "non-const-getter")).toBe(true);
    expect(has("class A { public: bool isEmpty(); };", "non-const-getter")).toBe(true);
  });
  it("accepts const getters, mutating 'getters', mutable accessors, void and parameterised members", () => {
    expect(has("class A { public: int getCount() const { return n_; } private: int n_ = 0; };", "non-const-getter")).toBe(false);
    expect(has("class A { public: int getNext() { return ++n_; } private: int n_ = 0; };", "non-const-getter")).toBe(false);
    expect(has("class A { public: int getNext() { n_ = n_ + 1; return n_; } private: int n_ = 0; };", "non-const-getter")).toBe(false);
    expect(has("class A { public: int& getRef() { return n_; } private: int n_ = 0; };", "non-const-getter")).toBe(false);
    expect(has("class A { public: void getReady(); int getAt(int i); int next() { return 1; } };", "non-const-getter")).toBe(false);
  });
  it("judges out-of-class definitions and skips overrides", () => {
    expect(has("class A { public: int size(); }; int A::size() { return 3 - 3; }", "non-const-getter")).toBe(true);
    expect(has("class A { public: int size(); int n_ = 0; }; int A::size() { n_ += 1; return n_; }", "non-const-getter")).toBe(false);
    expect(has("class B { public: virtual ~B() = default; virtual int getId() const = 0; }; class D : public B { public: int getId() override; };", "non-const-getter")).toBe(false);
  });
});

describe("magic-number (minor)", () => {
  it("flags unnamed constants in a function body, once per function", () => {
    const f = reviewFiles([{ path: "a.cpp", content: "int fee(int days) { return days * 15 + 15 + 0x20; }" }]).findings.find((x) => x.rule === "magic-number");
    expect(f?.message).toContain("15, 0x20");
  });
  it("accepts 0, 1, 2, named constants, case labels, fields and comments", () => {
    expect(has("int f(int x) { return x * 2 + 1 - 0; }", "magic-number")).toBe(false);
    expect(has("int f(int x) { constexpr int kMax = 40; static const double kRate = 0.15; return x < kMax ? 0 : 1; }", "magic-number")).toBe(false);
    expect(has("int f(int x) { switch (x) { case 7: return 1; default: return 0; } }", "magic-number")).toBe(false);
    expect(has("class A { int limit_ = 5; public: int g() const { return limit_; } };", "magic-number")).toBe(false);
    expect(has("int f() { return 1; } // 99 problems", "magic-number")).toBe(false);
  });
  it("sees numbers inside in-class method bodies", () => {
    expect(has("class A { public: bool full() const { return n_ >= 10; } private: int n_ = 0; };", "magic-number")).toBe(true);
  });
});

describe("unclear-name (minor)", () => {
  it("flags placeholder class, method and field names", () => {
    expect(has("class Helper { public: int g() const; };", "unclear-name")).toBe(true);
    expect(has("class OrderUtils { };", "unclear-name")).toBe(true);
    expect(has("class A { public: void doIt(); };", "unclear-name")).toBe(true);
    expect(has("class A { private: int tmp_ = 0; };", "unclear-name")).toBe(true);
  });
  it("accepts domain names, struct coordinates and the names of constructors/operators", () => {
    expect(has("class LoanPolicy { public: bool allows(int copies) const; private: int maxLoans_ = 0; };", "unclear-name")).toBe(false);
    expect(has("struct Point { int x; int y; };", "unclear-name")).toBe(false);
    expect(has("class Money { public: bool operator==(const Money&) const; };", "unclear-name")).toBe(false);
  });
});
