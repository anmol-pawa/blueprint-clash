A diagram tool has two things that change independently: the **shapes** (circle, rectangle, later more) and the **backends** (SVG markup, plain text, later PNG). Writing `SvgCircle`, `TextCircle`, `SvgRectangle`, `TextRectangle` would multiply classes with every addition. Use a Bridge: shapes hold a `Renderer&` and know nothing else about the backend. `api.h` gives `Renderer` and `Shape`. Write in `solution.h`:

- `SvgRenderer`: `line(x1,y1,x2,y2)` appends `<line x1="x1" y1="y1" x2="x2" y2="y2"/>` and a newline; `circle(cx,cy,r)` appends `<circle cx="cx" cy="cy" r="r"/>` and a newline. `result()` returns everything appended.
- `TextRenderer`: `line` appends `LINE x1,y1 -> x2,y2`; `circle` appends `CIRCLE (cx,cy) r=r`, each followed by a newline.
- `Circle(Renderer&, int cx, int cy, int r)`: `draw()` makes exactly one `renderer.circle` call.
- `Rectangle(Renderer&, int x, int y, int w, int h)`: `draw()` makes four `renderer.line` calls, in this order: top `(x,y)->(x+w,y)`, right `(x+w,y)->(x+w,y+h)`, bottom `(x+w,y+h)->(x,y+h)`, left `(x,y+h)->(x,y)`.
- `move(dx,dy)` shifts the shape; later `draw()` calls use the new position. `setRenderer` switches the backend at runtime without touching the shape's geometry.
- `Drawing`: `Drawing& add(std::unique_ptr<Shape>)` (ignores `nullptr`), `std::size_t size() const`, `void draw() const` draws shapes in insertion order, and `void useRenderer(Renderer&)` retargets **every** shape.

A shape must call only the `Renderer` interface: new backends must work with no change to any shape.
