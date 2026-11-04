#pragma once
#include <optional>
#include <string>
#include <utility>
#include <vector>

// TODO: HttpRequest must be immutable with no public constructor; the builder validates.
class HttpRequest {
 public:
  HttpRequest() = default;
  const std::string& method() const { return method_; }
  const std::string& url() const { return url_; }
  const std::string& body() const { return body_; }
  int timeoutMs() const { return timeoutMs_; }
  const std::vector<std::pair<std::string, std::string>>& headers() const { return headers_; }

 private:
  std::string method_;
  std::string url_;
  std::string body_;
  int timeoutMs_ = 0;
  std::vector<std::pair<std::string, std::string>> headers_;
};

class HttpRequestBuilder {
 public:
  HttpRequestBuilder& method(std::string m) { return *this; }
  HttpRequestBuilder& url(std::string u) { return *this; }
  HttpRequestBuilder& header(std::string name, std::string value) { return *this; }
  HttpRequestBuilder& body(std::string b) { return *this; }
  HttpRequestBuilder& timeoutMs(int ms) { return *this; }
  std::optional<HttpRequest> build() const { return std::nullopt; }
};
