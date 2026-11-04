#pragma once
#include <string>

// The "implementor" side of the bridge: how pixels, text or markup actually get produced.
class Renderer {
 public:
  virtual ~Renderer() = default;
  virtual void line(int x1, int y1, int x2, int y2) = 0;
  virtual void circle(int cx, int cy, int r) = 0;
  // Everything drawn so far, one primitive per line.
  virtual std::string result() const = 0;
};

// The "abstraction" side: what is being drawn. A shape never knows which backend it talks to.
class Shape {
 public:
  virtual ~Shape() = default;
  virtual void draw() const = 0;
  virtual void move(int dx, int dy) = 0;
  virtual void setRenderer(Renderer& renderer) = 0;
};
