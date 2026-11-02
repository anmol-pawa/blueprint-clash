#pragma once
#include <string>

class Shape {
 public:
  virtual ~Shape() = default;  // required: shapes are deleted through Shape*
  virtual double area() const { return 0; }
  virtual std::string name() const { return ""; }
};

class Circle final : public Shape {
 public:
  explicit Circle(double radius) : radius_(radius) {}
  double area() const override { return kPi * radius_ * radius_; }
  std::string name() const override { return "circle"; }

 private:
  static constexpr double kPi = 3.14159265358979;
  double radius_;
};

class Rectangle final : public Shape {
 public:
  Rectangle(double width, double height) : width_(width), height_(height) {}
  double area() const override { return width_ * height_; }
  std::string name() const override { return "rectangle"; }

 private:
  double width_;
  double height_;
};
