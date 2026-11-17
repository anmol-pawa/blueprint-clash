#pragma once
#include <optional>
#include <string>

// The shape of one hall and the naming of its seats. It knows nothing about who holds what.
// Seats are numbered row-major from 0; "A1" is index 0.
class Layout {
 public:
  Layout(int rows, int seatsPerRow) : rows_(rows), seatsPerRow_(seatsPerRow) {}

  int rows() const { return rows_; }
  int seatsPerRow() const { return seatsPerRow_; }
  int size() const { return rows_ * seatsPerRow_; }
  int indexOf(int row, int seat) const { return row * seatsPerRow_ + seat; }

  // Parses "C12" into an index. Anything malformed or out of range gives an empty optional.
  std::optional<int> parse(const std::string& name) const {
    if (name.size() < 2 || name.size() > 3) return std::nullopt;
    const int row = name[0] - 'A';
    if (row < 0 || row >= rows_) return std::nullopt;
    if (name[1] == '0') return std::nullopt;
    int number = 0;
    for (std::size_t i = 1; i < name.size(); ++i) {
      if (name[i] < '0' || name[i] > '9') return std::nullopt;
      number = number * 10 + (name[i] - '0');
    }
    if (number < 1 || number > seatsPerRow_) return std::nullopt;
    return indexOf(row, number - 1);
  }

  std::string nameOf(int index) const {
    return std::string(1, static_cast<char>('A' + index / seatsPerRow_)) + std::to_string(index % seatsPerRow_ + 1);
  }

 private:
  int rows_;
  int seatsPerRow_;
};
