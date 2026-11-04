#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

// TODO: implement SvgRenderer, TextRenderer, Circle, Rectangle and Drawing.
// Shapes must hold only a Renderer (a bridge), never an SvgRenderer or TextRenderer.
class SvgRenderer : public Renderer {
 public:
  void line(int, int, int, int) override {}
  void circle(int, int, int) override {}
  std::string result() const override { return ""; }
};

class TextRenderer : public Renderer {
 public:
  void line(int, int, int, int) override {}
  void circle(int, int, int) override {}
  std::string result() const override { return ""; }
};

class Circle : public Shape {
 public:
  Circle(Renderer& renderer, int cx, int cy, int r) { (void)renderer; (void)cx; (void)cy; (void)r; }
  void draw() const override {}
  void move(int, int) override {}
  void setRenderer(Renderer&) override {}
};

class Rectangle : public Shape {
 public:
  Rectangle(Renderer& renderer, int x, int y, int w, int h) { (void)renderer; (void)x; (void)y; (void)w; (void)h; }
  void draw() const override {}
  void move(int, int) override {}
  void setRenderer(Renderer&) override {}
};

class Drawing {
 public:
  Drawing& add(std::unique_ptr<Shape> shape) {
    (void)shape;
    return *this;
  }
  std::size_t size() const { return 0; }
  void draw() const {}
  void useRenderer(Renderer& renderer) { (void)renderer; }
};
