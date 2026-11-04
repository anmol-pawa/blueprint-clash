#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

class SvgRenderer final : public Renderer {
 public:
  void line(int x1, int y1, int x2, int y2) override {
    out_ += "<line x1=\"" + std::to_string(x1) + "\" y1=\"" + std::to_string(y1) + "\" x2=\"" + std::to_string(x2) +
            "\" y2=\"" + std::to_string(y2) + "\"/>\n";
  }
  void circle(int cx, int cy, int r) override {
    out_ += "<circle cx=\"" + std::to_string(cx) + "\" cy=\"" + std::to_string(cy) + "\" r=\"" + std::to_string(r) +
            "\"/>\n";
  }
  std::string result() const override { return out_; }

 private:
  std::string out_;
};

class TextRenderer final : public Renderer {
 public:
  void line(int x1, int y1, int x2, int y2) override {
    out_ += "LINE " + std::to_string(x1) + "," + std::to_string(y1) + " -> " + std::to_string(x2) + "," +
            std::to_string(y2) + "\n";
  }
  void circle(int cx, int cy, int r) override {
    out_ += "CIRCLE (" + std::to_string(cx) + "," + std::to_string(cy) + ") r=" + std::to_string(r) + "\n";
  }
  std::string result() const override { return out_; }

 private:
  std::string out_;
};

// The bridge: every shape holds the Renderer interface and nothing more concrete.
class RenderedShape : public Shape {
 public:
  explicit RenderedShape(Renderer& renderer) : renderer_(&renderer) {}
  void setRenderer(Renderer& renderer) override { renderer_ = &renderer; }

 protected:
  Renderer& renderer() const { return *renderer_; }

 private:
  Renderer* renderer_;
};

class Circle final : public RenderedShape {
 public:
  Circle(Renderer& renderer, int cx, int cy, int r) : RenderedShape(renderer), cx_(cx), cy_(cy), r_(r) {}
  void draw() const override { renderer().circle(cx_, cy_, r_); }
  void move(int dx, int dy) override {
    cx_ += dx;
    cy_ += dy;
  }

 private:
  int cx_, cy_, r_;
};

class Rectangle final : public RenderedShape {
 public:
  Rectangle(Renderer& renderer, int x, int y, int w, int h) : RenderedShape(renderer), x_(x), y_(y), w_(w), h_(h) {}
  void draw() const override {
    renderer().line(x_, y_, x_ + w_, y_);
    renderer().line(x_ + w_, y_, x_ + w_, y_ + h_);
    renderer().line(x_ + w_, y_ + h_, x_, y_ + h_);
    renderer().line(x_, y_ + h_, x_, y_);
  }
  void move(int dx, int dy) override {
    x_ += dx;
    y_ += dy;
  }

 private:
  int x_, y_, w_, h_;
};

class Drawing {
 public:
  Drawing& add(std::unique_ptr<Shape> shape) {
    if (shape) shapes_.push_back(std::move(shape));
    return *this;
  }
  std::size_t size() const { return shapes_.size(); }
  void draw() const {
    for (const auto& s : shapes_) s->draw();
  }
  void useRenderer(Renderer& renderer) {
    for (const auto& s : shapes_) s->setRenderer(renderer);
  }

 private:
  std::vector<std::unique_ptr<Shape>> shapes_;
};
