#include <memory>
#include <string>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
// A brand-new backend written by the test: shapes must work with it without any change.
class RecordingRenderer final : public Renderer {
 public:
  void line(int x1, int y1, int x2, int y2) override {
    calls.push_back("L" + std::to_string(x1) + "," + std::to_string(y1) + "," + std::to_string(x2) + "," + std::to_string(y2));
  }
  void circle(int cx, int cy, int r) override {
    calls.push_back("C" + std::to_string(cx) + "," + std::to_string(cy) + "," + std::to_string(r));
  }
  std::string result() const override { return std::to_string(calls.size()); }
  std::vector<std::string> calls;
};
}  // namespace

TEST(Renderers, SvgFormatsPrimitives) {
  SvgRenderer svg;
  svg.line(0, 0, 5, 5);
  svg.circle(1, 2, 3);
  EXPECT_EQ(svg.result(), std::string("<line x1=\"0\" y1=\"0\" x2=\"5\" y2=\"5\"/>\n<circle cx=\"1\" cy=\"2\" r=\"3\"/>\n"));
}

TEST(Renderers, TextFormatsPrimitives) {
  TextRenderer text;
  text.line(0, 0, 5, 5);
  text.circle(1, 2, 3);
  EXPECT_EQ(text.result(), std::string("LINE 0,0 -> 5,5\nCIRCLE (1,2) r=3\n"));
}

TEST(Shapes, CircleMakesOneCircleCall) {
  RecordingRenderer rec;
  Circle c(rec, 4, 5, 6);
  c.draw();
  ASSERT_EQ(rec.calls.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(rec.calls[0], std::string("C4,5,6"));
}

TEST(Shapes, RectangleDrawsFourEdgesInOrder) {
  RecordingRenderer rec;
  Rectangle r(rec, 1, 2, 10, 20);
  r.draw();
  const std::vector<std::string> expected = {"L1,2,11,2", "L11,2,11,22", "L11,22,1,22", "L1,22,1,2"};
  EXPECT_TRUE(rec.calls == expected);
}

TEST(Shapes, MoveShiftsEveryCoordinate) {
  RecordingRenderer rec;
  Circle c(rec, 0, 0, 2);
  Rectangle r(rec, 0, 0, 3, 3);
  c.move(5, -1);
  r.move(1, 1);
  c.draw();
  r.draw();
  ASSERT_EQ(rec.calls.size(), static_cast<std::size_t>(5));
  EXPECT_EQ(rec.calls[0], std::string("C5,-1,2"));
  EXPECT_EQ(rec.calls[1], std::string("L1,1,4,1"));
  EXPECT_EQ(rec.calls[4], std::string("L1,4,1,1"));
}

TEST(Bridge, SameShapeTwoBackends) {
  SvgRenderer svg;
  TextRenderer text;
  Circle a(svg, 1, 1, 1);
  Circle b(text, 1, 1, 1);
  a.draw();
  b.draw();
  EXPECT_EQ(svg.result(), std::string("<circle cx=\"1\" cy=\"1\" r=\"1\"/>\n"));
  EXPECT_EQ(text.result(), std::string("CIRCLE (1,1) r=1\n"));
}

TEST(Bridge, SwitchRendererAtRuntime) {
  SvgRenderer svg;
  TextRenderer text;
  Rectangle r(svg, 0, 0, 2, 2);
  r.draw();
  r.setRenderer(text);
  r.draw();
  EXPECT_EQ(svg.result().find("LINE"), std::string::npos);
  EXPECT_EQ(text.result(), std::string("LINE 0,0 -> 2,0\nLINE 2,0 -> 2,2\nLINE 2,2 -> 0,2\nLINE 0,2 -> 0,0\n"));
}

TEST(Drawing, DrawsInInsertionOrderAndSkipsNull) {
  RecordingRenderer rec;
  Drawing d;
  d.add(std::make_unique<Circle>(rec, 1, 1, 1)).add(nullptr).add(std::make_unique<Circle>(rec, 2, 2, 2));
  EXPECT_EQ(d.size(), static_cast<std::size_t>(2));
  d.draw();
  ASSERT_EQ(rec.calls.size(), static_cast<std::size_t>(2));
  EXPECT_EQ(rec.calls[0], std::string("C1,1,1"));
  EXPECT_EQ(rec.calls[1], std::string("C2,2,2"));
}

TEST(Drawing, UseRendererRetargetsEveryShape) {
  SvgRenderer svg;
  TextRenderer text;
  Drawing d;
  d.add(std::make_unique<Circle>(svg, 1, 1, 1)).add(std::make_unique<Circle>(svg, 2, 2, 2)).add(std::make_unique<Circle>(svg, 3, 3, 3));
  d.useRenderer(text);
  d.draw();
  EXPECT_EQ(svg.result(), std::string(""));
  EXPECT_EQ(text.result(), std::string("CIRCLE (1,1) r=1\nCIRCLE (2,2) r=2\nCIRCLE (3,3) r=3\n"));
}
