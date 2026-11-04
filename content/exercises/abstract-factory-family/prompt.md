A settings screen draws buttons and checkboxes. Today each call site picks `LightButton` or `DarkCheckbox` by hand, and last week a dark button ended up beside a light checkbox. Fix it with an **abstract factory**: one factory per visual family, and screens that only ever hold a `WidgetFactory`. `api.h` gives `Button`, `Checkbox` and `WidgetFactory`. Write these in `solution.h`:

- `LightFactory` and `DarkFactory`, both `WidgetFactory`s. Every product a factory makes reports that factory's family from `family()`: `"light"` or `"dark"`. Rendering:
  - light: button `[Sign in]`, checkbox `[x] Remember me` / `[ ] Remember me`
  - dark: button `<Sign in>`, checkbox `(x) Remember me` / `( ) Remember me`
- `std::unique_ptr<WidgetFactory> makeFactory(const std::string& family)`: `"light"` or `"dark"`; anything else (including `""`) gives `nullptr`.
- `std::string renderLogin(const WidgetFactory& factory)`: the login screen, built **only** through the factory: the checkbox `"Remember me"` (checked), a newline, then the button `"Sign in"`. It must work for a factory you have never seen: the tests pass in a new family.

Each `create...` call returns a new object. Keep the concrete product classes out of the public face of the screen code: `renderLogin` must not name them.
