Building an HTTP request by hand means a constructor with six positional arguments, half of them optional, and nothing stops a caller from sending a body with `GET`. Write a validating **builder** in `solution.h`.

**`HttpRequest`**: an immutable value. It has *no* public constructor (only the builder, a friend, can make one) and only getters: `method()`, `url()`, `body()` (all `const std::string&`), `timeoutMs()` (`int`) and `headers()` (`const std::vector<std::pair<std::string, std::string>>&`). It must stay copyable.

**`HttpRequestBuilder`**: fluent setters that each return `*this` (`HttpRequestBuilder&`): `method(std::string)`, `url(std::string)`, `header(std::string name, std::string value)`, `body(std::string)`, `timeoutMs(int)`. Then `std::optional<HttpRequest> build() const`, which returns `std::nullopt` when the settings are invalid. Defaults: method `"GET"`, timeout `30000`, no headers, empty body.

Rules checked in `build()`:
- the URL is required and starts with `http://` or `https://`;
- the method is one of `GET`, `POST`, `PUT`, `DELETE`;
- a non-empty body needs `POST` or `PUT`;
- the timeout is between 1 and 120000 inclusive;
- header names are not empty, and header names are compared **case-insensitively**: setting the same name again replaces its value, keeping the first position and the first spelling.

`build()` is `const`: the builder can be reused or changed afterwards without affecting a request already built.
