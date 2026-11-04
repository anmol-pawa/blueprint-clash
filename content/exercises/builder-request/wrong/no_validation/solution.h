#pragma once
#include <algorithm>
#include <cctype>
#include <optional>
#include <string>
#include <utility>
#include <vector>

class HttpRequestBuilder;

// An immutable value: only the builder can make one, so every instance is valid.
class HttpRequest {
 public:
  const std::string& method() const { return method_; }
  const std::string& url() const { return url_; }
  const std::string& body() const { return body_; }
  int timeoutMs() const { return timeoutMs_; }
  const std::vector<std::pair<std::string, std::string>>& headers() const { return headers_; }

 private:
  friend class HttpRequestBuilder;
  HttpRequest() = default;

  std::string method_;
  std::string url_;
  std::string body_;
  int timeoutMs_ = 30000;
  std::vector<std::pair<std::string, std::string>> headers_;
};

class HttpRequestBuilder {
 public:
  HttpRequestBuilder& method(std::string m) {
    method_ = std::move(m);
    return *this;
  }
  HttpRequestBuilder& url(std::string u) {
    url_ = std::move(u);
    return *this;
  }
  HttpRequestBuilder& header(std::string name, std::string value) {
    for (auto& existing : headers_) {
      if (sameName(existing.first, name)) {
        existing.second = std::move(value);  // replace the value, keep position and spelling
        return *this;
      }
    }
    headers_.emplace_back(std::move(name), std::move(value));
    return *this;
  }
  HttpRequestBuilder& body(std::string b) {
    body_ = std::move(b);
    return *this;
  }
  HttpRequestBuilder& timeoutMs(int ms) {
    timeoutMs_ = ms;
    return *this;
  }

  // All validation lives here, so an HttpRequest that exists is always valid.
  std::optional<HttpRequest> build() const {
    HttpRequest request;
    request.method_ = method_;
    request.url_ = url_;
    request.body_ = body_;
    request.timeoutMs_ = timeoutMs_;
    request.headers_ = headers_;
    return request;
  }

 private:
  static bool startsWith(const std::string& s, const std::string& prefix) {
    return s.compare(0, prefix.size(), prefix) == 0;
  }
  static bool sameName(const std::string& a, const std::string& b) {
    if (a.size() != b.size()) return false;
    return std::equal(a.begin(), a.end(), b.begin(), [](char x, char y) {
      return std::tolower(static_cast<unsigned char>(x)) == std::tolower(static_cast<unsigned char>(y));
    });
  }

  std::string method_ = "GET";
  std::string url_;
  std::string body_;
  int timeoutMs_ = 30000;
  std::vector<std::pair<std::string, std::string>> headers_;
};
