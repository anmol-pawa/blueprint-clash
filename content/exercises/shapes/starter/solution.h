#pragma once
#include <string>

// TODO: make Shape an interface that is safe to delete through a base pointer.
class Shape {
 public:
  double area() const { return 0; }
  std::string name() const { return ""; }
};

class Circle : public Shape {
 public:
  explicit Circle(double radius) : radius_(radius) {}

 private:
  double radius_;
};

class Rectangle : public Shape {
 public:
  Rectangle(double width, double height) : width_(width), height_(height) {}

 private:
  double width_;
  double height_;
};
