#pragma once

// A half-open stretch of minutes [start, end): plain data.
struct Span {
  int start = 0;
  int end = 0;
};

// Two spans clash when each starts before the other ends, so one that ends at 60 and one that starts at 60 do not.
inline bool overlaps(const Span& a, const Span& b) { return a.start < b.end && b.start < a.end; }
